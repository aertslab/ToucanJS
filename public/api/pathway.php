<?php
class Pathway extends API {

    public function get($id, $params) {
        try {
            if (empty($id)) {
                $where = array();
                $tokens = array();
                $qry = "
                    SELECT Pathway.ID, Pathway.Name, GROUP_CONCAT(DISTINCT Plant.Name) as Plant, Pathway.Description
                    FROM Pathway
                    LEFT JOIN PathwayHasPath ON PathwayHasPath.PathwayID = Pathway.ID
                    LEFT JOIN Path ON Path.ID = PathwayHasPath.PathID
                    LEFT JOIN Enzyme ON Enzyme.ID = Path.EnzymeID
                    LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
                    WHERE Pathway.ID IN (
                        SELECT Pathway.ID FROM Pathway
                        LEFT JOIN PathwayHasPath ON PathwayHasPath.PathwayID = Pathway.ID
                        LEFT JOIN Path ON Path.ID = PathwayHasPath.PathID
                        LEFT JOIN Enzyme ON Enzyme.ID = Path.EnzymeID
                        LEFT JOIN Plant ON Plant.ID = Enzyme.PlantID
                ";
                if (isset($params['PlantName'])) {
                    $where[] = " Plant.Name LIKE CONCAT('%', :PlantName ,'%') ";
                    $tokens[':PlantName'] = $params['PlantName'];
                }
                if (isset($params['PlantID'])) {
                    $where[] = " Enzyme.PlantID = :PlantID ";
                    $tokens[':PlantID'] = $params['PlantID'];
                }
                if (count($where)) {
                    $qry .= " WHERE ".implode(" AND ", $where);
                }
                $qry .= "
                    )
                    GROUP BY Pathway.ID
                    ORDER BY Pathway.Name ASC
                ";
                $qry = $this->db->prepare($qry);
                $qry->setFetchMode(PDO::FETCH_ASSOC);
                $qry->execute($tokens);
                $res = $qry->fetchAll();
            } else {
                $qry = $this->db->prepare("SELECT * FROM Pathway WHERE ID = :ID");
                $qry->setFetchMode(PDO::FETCH_ASSOC);
                $qry->execute(array(":ID" => $id));
                $res = $qry->fetch();
                $res['Coords'] = json_decode($res['Coords']);
                $res['Properties'] = json_decode($res['Properties']);

                $qry = $this->db->prepare("
                    SELECT * FROM PathwayHasPath
                    LEFT JOIN Path ON PathwayHasPath.PathID = Path.ID
                    WHERE PathwayHasPath.PathwayID = :ID
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

                    $qry = $this->db->prepare("SELECT * FROM Enzyme WHERE ID = :ID");
                    $qry->setFetchMode(PDO::FETCH_ASSOC);
                    $qry->execute(array(':ID' => $path['EnzymeID']));
                    $paths[$key]['enzyme'] = $qry->fetch();
                }

                $res['paths'] = $paths;
            }
            echo json_encode($res, JSON_NUMERIC_CHECK);
        } catch (PDOException $e) {
            echo "Error: ". $e->getMessage();
        }
    }

    public function post($id, $params) {
        if (!$this->authenticated) {
            header("HTTP/1.0 401 Unauthorized");
            die();
        }
        try {
            $params = json_decode(file_get_contents("php://input"));
            if (empty($id)) {
                $qry = $this->db->prepare("INSERT INTO Pathway (:Name, :Coords, :Properties) VALUES (:Name, :Coords, :Properties)");
                $qry->setFetchMode(PDO::FETCH_ASSOC);
                $res = $qry->execute(array(
                    ":Name" => $params->Name,
                    ":Coords" => json_encode($params->Coords),
                    ":Properties" => json_encode($params->Properties),
                ));
            } else {
                $qry = $this->db->prepare("UPDATE Pathway SET Name = :Name, Coords = :Coords, Properties = :Properties WHERE ID = :ID");
                $qry->setFetchMode(PDO::FETCH_ASSOC);
                $res = $qry->execute(array(
                    ":ID" => $id,
                    ":Name" => $params->Name,
                    ":Coords" => json_encode($params->Coords),
                    ":Properties" => json_encode($params->Properties),
                ));
            }
            echo json_encode($res, JSON_NUMERIC_CHECK);
        } catch (PDOException $e) {
            echo "Error: ". $e->getMessage();
        }
    }

}