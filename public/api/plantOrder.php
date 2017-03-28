<?php
class PlantOrder extends API {

	protected function addChildren($orders, &$tree, $parentID) {
		foreach ($orders as $id => $order) {
			if ($order['ParentID'] == $parentID) {
				$order['branchset'] = array();
				$order['id'] = $order['ID'];
				$order['name'] = $order['Name'];
				//$order['plant'] = $order['PlantName'];
				if (!empty($order['PlantName'])) {
					$plants = split(", ",$order['PlantName']);
					foreach ($plants as $k => $p) {
						$ids = split(", ", $order['PlantID']);
						$order['branchset'][] = array(
							'branchset' => array(),
							'id' => $ids[$k],
							'name' => $p,
						);
					}
				} else {
					$this->addChildren($orders, $order, $order['ID']);
				}
				$tree['branchset'][] = $order;
			}
		}
	}

	public function get($id, $params) {
		try {
			$qry = $this->db->prepare("SELECT PlantOrder.ID, PlantOrder.Name, PlantOrder.ParentID, Plant.ID as PlantID, Plant.Name as PlantName FROM PlantOrder LEFT JOIN Plant ON Plant.OrderID = PlantOrder.ID ORDER BY ID ASC");
			$qry->setFetchMode(PDO::FETCH_ASSOC);
			$qry->execute(array());
			$orders = array();
			while($r = $qry->fetch()) {
				if (empty($orders[$r['ID']])) {
					$orders[$r['ID']] = $r;
				} else {
					$orders[$r['ID']]['PlantID'] .= ', '.$r['PlantID'];
					$orders[$r['ID']]['PlantName'] .= ', '.$r['PlantName'];
				}
			};
			$tree = array('branchset' => array());
			if (empty($id)) {
				$this->addChildren($orders, $tree, null);
			} else {
				$this->addChildren($orders, $tree, $id);
			}
			echo json_encode($tree['branchset'], JSON_NUMERIC_CHECK);
		} catch (PDOException $e) {
			echo "Error: ". $e->getMessage();
		}
	}
}