<?php

class Workspace extends API {

    public function get($id, $params) {
        echo json_encode($this->workspace->get());
    }

    public function delete($id, $params) {
    	$this->workspace->destroy();
    	echo json_encode($this->workspace->get());
    }

}