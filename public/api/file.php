<?php

class File extends API {

    public function get($id, $params) {
        try {
            if (empty($id)) {
                $filename = $this->uploadsDir . $params['id'];
                $file = @file_get_contents($filename);
                $file = explode("\n", $file);
            }
            echo json_encode(array("features" => $file));
        } catch (Exception $e) {
            echo "Error: ". $e->getMessage();
        }
    }

    public function post($id, $params) {
        try {
            if (!isset($_FILES['file'])) throw new Exception("Missing file");
            $fileID = md5($_FILES['file']['tmp_name'] . $_FILES['file']['name'] . time());
            $filename = $this->uploadsDir . $fileID;
            if (!move_uploaded_file($_FILES['file']['tmp_name'], $filename)) throw new Exception("Unable to save file");
            if (!$this->workspace->addFile($fileID, $_FILES['file']['name'])) throw new Exception("Unable to save workspace");
            echo json_encode(array("id" => $this->workspace->getID()));
        } catch (Exception $e) {
            echo "Error: ". $e->getMessage();
        }
    }

    public function delete($id, $params) {
        try {
            $fileID = $params['id'];
            $filename = $this->uploadsDir . $fileID;
            if (!$this->workspace->deleteFile($fileID)) throw new Exception("Unable to save workspace");
            if (!unlink($filename)) throw new Exception("Unable to delete file");
            echo json_encode(array("id" => $this->workspace->getID()));
        } catch (Exception $e) {
            echo "Error: ". $e->getMessage();
        }
    }
}