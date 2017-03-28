<?php
class Country extends API {

	public function get() {
		try {
			$qry = $this->db->prepare("SELECT * FROM tblCountries ORDER BY Name ASC");
			$qry->setFetchMode(PDO::FETCH_ASSOC);
			$qry->execute();
			$res = $qry->fetchAll();
			echo json_encode($res, JSON_NUMERIC_CHECK);
		} catch (PDOException $e) {
			echo "Error: ". $e->getMessage();
		}
	}
}