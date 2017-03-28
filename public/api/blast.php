<?php
class Blast extends API {

	protected $TranscriptDB;
	protected $ProteinDB;


	function __construct() {
		parent::__construct();
		$this->TranscriptDB = $this->blastFilesDir."TriForC-t.fsa";
		$this->ProteinDB = $this->blastFilesDir."TriForC-p.fsa";
	}

	function returnError() {
		header("HTTP/1.0 500 Internal Server Error");
		print_r(error_get_last());
		die();
	}

	function makeblastdb() {
		$qry = $this->db->prepare("SELECT * FROM Enzyme");
		$qry->execute();
		$out = @file_put_contents($this->TranscriptDB, "; Generated on ".date("Y-m-d H:i:s")."\n\n");
		if ($out === FALSE) $this->returnError();
		$out = @file_put_contents($this->ProteinDB, "; Generated on ".date("Y-m-d H:i:s")."\n\n");
		if ($out === FALSE) $this->returnError();
		while ($row = $qry->fetch()) {
			if (!empty($row['GenomicSequence'])) {
				$dataT = ">ref|".$row['Genbank']."|\n";
				$dataT .= wordwrap($row['GenomicSequence'], 80, "\n");
				$dataT .= "\n\n";
				$out = @file_put_contents($this->TranscriptDB, $dataT, FILE_APPEND);
				if ($out === FALSE) $this->returnError();
			}
			if (!empty($row['ProteinSequence'])) {
				$dataP = ">ref|".$row['Genbank']."|\n";
				$dataP .= wordwrap($row['ProteinSequence'], 80, "\n");
				$dataP .= "\n\n";
				$out = @file_put_contents($this->ProteinDB, $dataP, FILE_APPEND);
				if ($out === FALSE) $this->returnError();
			}
		}
		exec("makeblastdb -in ".$this->TranscriptDB." -parse_seqids -dbtype nucl", $output, $status);
		if ($status != 0) $this->returnError();
		exec("makeblastdb -in ".$this->ProteinDB." -parse_seqids -dbtype prot", $output, $status);
		if ($status != 0) $this->returnError();
	}

	function post($id, $params) {
		$this->makeblastdb();
		$params = json_decode(file_get_contents("php://input"));
		if (!in_array($params->program, array("blastn", "blastp", "blastx"))) die("Unsupported program");
		if (!in_array($params->database, array("TranscriptDB", "ProteinDB"))) die("Unsupported database");
		if (!is_int((int)$params->format)) die("Unsupported format");
		if (
			($params->program == 'blastp' && (strlen($params->sequence) > $this->blastpMaxLength))
			|| (strlen($params->sequence) > $this->blastnMaxLength)
		   )
			die("Sequence too long");

		$jobid = md5(time() . $params->sequence);
		$jobdir = $this->blastFilesDir."jobs/".$jobid;
		$fastafile = $jobdir."/query.fasta";
		$jobfile = $jobdir."/job.sh";
		$outputfile = $jobdir."/output.txt";
		$out = @mkdir($jobdir);
		if ($out === FALSE) $this->returnError();
		$out = @file_put_contents($fastafile, $params->sequence);
		if ($out === FALSE) $this->returnError();
		$cmd = "#!/bin/sh"."\n".$params->program." -query $fastafile -outfmt ".$params->format." -db ".$this->{$params->database}." 1>$outputfile && touch $jobdir/finished";
		$out = @file_put_contents($jobfile, $cmd);
		if ($out === FALSE) $this->returnError();
		$out = @chmod($jobfile, 0755);
		if ($out === FALSE) $this->returnError();


		if ($this->blastRunOnCluster) {
			exec("qsub $jobfile", $output, $status);
		} else {
			exec("sh $jobfile &", $output, $status);
		}

		echo json_encode(array("ID" => $jobid));
	}

	function get($id, $params) {
		if (!empty($id)) {
			$jobdir = $this->blastFilesDir."jobs/".$id;
			$outputfile = $jobdir."/output.txt";
			if (file_exists($jobdir."/finished")) {
				echo json_encode(array("output" => file_get_contents($outputfile)));
			} else {
				header("HTTP/1.0 404 Not Found");
			}
		} else {
			echo json_encode(array("maxlength" => array( "blastn" => $this->blastnMaxLength, "blastp" => $this->blastpMaxLength, "blastx" => $this->blastnMaxLength)));
		}
	}
}

