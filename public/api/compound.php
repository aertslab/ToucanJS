<?php
class Compound extends API {

	public function get($id, $params) {
		$compound = null;
		try {
			if (empty($id)) {
				$where = array();
				$tokens = array();
				$qry = "
					SELECT *
					FROM Compound
					LEFT JOIN CompoundHasType ON Compound.ID = CompoundHasType.CompoundID
				";
				if (isset($params['CompoundTypeID'])) {
					$where[] = " CompoundHasType.CompoundTypeID = :CompoundTypeID ";
					$tokens[':CompoundTypeID'] = $params['CompoundTypeID'];
				}
				if (isset($params['Name'])) {
					$where[] = " Compound.Name LIKE CONCAT('%', :Name ,'%') ";
					$tokens[':Name'] = $params['Name'];
				}
				if (isset($params['Alias'])) {
					$where[] = " Compound.Alias LIKE CONCAT('%', :Alias ,'%') ";
					$tokens[':Alias'] = $params['Alias'];
				}
				if (isset($params['CAS'])) {
					$where[] = " Compound.CAS LIKE CONCAT('%', :CAS ,'%') ";
					$tokens[':CAS'] = $params['CAS'];
				}
				if (count($where)) {
					$qry .= " WHERE ".implode(" AND ", $where);
				}
				$qry .= "
					ORDER BY Compound.Name ASC
				";
				$qry = $this->db->prepare($qry);
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute($tokens);
				$allCompounds = $qry->fetchAll();
				$compound = array();
				foreach ($allCompounds as $k => $c) {
					$qry = "
						SELECT DISTINCT Plant.ID, Plant.Name
						FROM Path
						LEFT JOIN Enzyme ON Path.EnzymeID = Enzyme.ID
						LEFT JOIN Plant ON Enzyme.PlantID = Plant.ID
						WHERE Path.SubstrateID = :ID OR Path.ProductID = :ID
					";
					$qry = $this->db->prepare($qry);
					$qry->setFetchMode(PDO::FETCH_ASSOC);
					$qry->execute(array(
						':ID' => $c['ID']
					));
                	$plants = array();
                	if ($qry->rowCount()) {
                		while ($p = $qry->fetch()) {
                			$plants[$p['ID']] = $p['Name'];
                		}
                	}
                	$c['Plant'] = implode(", ", $plants);
					if ((!isset($params['PlantID']))||(isset($params['PlantID']) && in_array($params['PlantID'], array_keys($plants)))) {
						$compound[] = $c;
					}
				}
			} else {
				$qry = $this->db->prepare("
					SELECT *, Compound.ID as ID, Compound.Name as Name
					FROM Compound
					WHERE Compound.ID = :ID
					");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$compound = $qry->fetch();

				$qry = $this->db->prepare("
					SELECT DISTINCT Path.EnzymeID, Path.Name as Name, Enzyme.Name as Enzyme, Plant.Name as Plant, Plant.ID as PlantID
					FROM Path
					LEFT JOIN Enzyme ON Path.EnzymeID = Enzyme.ID
					LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
					WHERE Path.SubstrateID = :ID
					");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$compound['asSubstrateOf'] = $qry->fetchAll();

				$qry = $this->db->prepare("
					SELECT DISTINCT Path.EnzymeID, Path.Name as Name, Enzyme.Name as Enzyme, Plant.Name as Plant, Plant.ID as PlantID
					FROM Path
					LEFT JOIN Enzyme ON Path.EnzymeID = Enzyme.ID
					LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
					WHERE Path.ProductID = :ID
					");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$compound['asProductOf'] = $qry->fetchAll();

				$qry = $this->db->prepare("
					SELECT * FROM Reference
					JOIN CompoundHasReference ON Reference.ID = CompoundHasReference.ReferenceID
					WHERE CompoundHasReference.CompoundID = :ID
				");
				$qry->setFetchMode(PDO::FETCH_ASSOC);
				$qry->execute(array(":ID" => $id));
				$compound['references'] = $qry->fetchAll();

			}
			echo json_encode($compound, JSON_NUMERIC_CHECK);
		} catch (PDOException $e) {
			echo "Error: ". $e->getMessage();
		}
	}
}