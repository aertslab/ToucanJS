<?php
class Enzyme extends API {

	public function get($id, $params) {
		$enzyme = null;
		try {
			if (empty($id)) {
				$where = array();
				$tokens = array();
				$qry = "
					SELECT *, Enzyme.ID as ID, Enzyme.Name as Name, Plant.Name as Plant, EnzymeType.Name as Type, Enzyme.Description as Description
					FROM Enzyme LEFT JOIN EnzymeType ON EnzymeType.ID = Enzyme.EnzymeTypeID LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
				";
				if (isset($params['EnzymeTypeID'])) {
					$where[] = " Enzyme.EnzymeTypeID = :EnzymeTypeID ";
					$tokens[':EnzymeTypeID'] = $params['EnzymeTypeID'];
				}
				if (isset($params['PlantName'])) {
					$where[] = " Plant.Name LIKE CONCAT('%', :PlantName ,'%') ";
					$tokens[':PlantName'] = $params['PlantName'];
				}
				if (isset($params['PlantID'])) {
					$where[] = " Enzyme.PlantID = :PlantID ";
					$tokens[':PlantID'] = $params['PlantID'];
				}
				if (isset($params['Name'])) {
					$where[] = " Enzyme.Name LIKE CONCAT('%', :Name ,'%') ";
					$tokens[':Name'] = $params['Name'];
				}
				if (isset($params['Description'])) {
					$where[] = " Enzyme.Description LIKE CONCAT('%', :Description ,'%') ";
					$tokens[':Description'] = $params['Description'];
				}
				if (isset($params['Genbank'])) {
					$where[] = " Enzyme.Genbank LIKE CONCAT('%', :Genbank ,'%') ";
					$tokens[':Genbank'] = $params['Genbank'];
				}
				if (count($where)) {
					$qry .= " WHERE ".implode(" AND ", $where);
				}
				$qry .= " ORDER BY Enzyme.Name ASC ";
				$qry = $this->db->prepare($qry);
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute($tokens);
				$enzyme = $qry->fetchAll();
			} else {
				$qry = $this->db->prepare("
					SELECT *, Enzyme.ID as ID, Enzyme.Name as Name, Plant.Name as Plant, EnzymeType.Name as Type, Enzyme.Description as Description
					FROM Enzyme LEFT JOIN EnzymeType ON EnzymeType.ID = Enzyme.EnzymeTypeID LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
					WHERE Enzyme.ID = :ID
					");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$enzyme = $qry->fetch();

				$qry = $this->db->prepare("
					SELECT * FROM Path
					WHERE Path.EnzymeID = :ID
					");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$paths = $qry->fetchAll();
				foreach ($paths as $key => $path) {
					$qry = $this->db->prepare("SELECT * FROM Compound WHERE ID = :ID");
					$qry->setFetchMode(PDO::FETCH_ASSOC);
					$qry->execute(array(':ID' => $path['SubstrateID']));
					$paths[$key]['substrate'] = $qry->fetch();
					$qry->execute(array(':ID' => $path['ProductID']));
					$paths[$key]['product'] = $qry->fetch();
					$qry = $this->db->prepare("SELECT * FROM PathwayHasPath LEFT JOIN Pathway ON PathwayHasPath.PathwayID = Pathway.ID WHERE PathwayHasPath.PathID = :ID");
					$qry->setFetchMode(PDO::FETCH_ASSOC);
					$qry->execute(array(':ID' => $path['ID']));
					$paths[$key]['pathway'] = $qry->fetch();
				}
				$enzyme['paths'] = $paths;

				$qry = $this->db->prepare("
					SELECT * FROM Reference
					JOIN EnzymeHasReference ON Reference.ID = EnzymeHasReference.ReferenceID
					WHERE EnzymeHasReference.EnzymeID = :ID
				");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$enzyme['references'] = $qry->fetchAll();

				$qry = $this->db->prepare("
					SELECT * FROM Links
					WHERE Links.EnzymeID = :ID
				");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$enzyme['links'] = $qry->fetchAll();

			}
			echo json_encode($enzyme, JSON_NUMERIC_CHECK);
		} catch (PDOException $e) {
			echo "Error: ". $e->getMessage();
		}
	}
}