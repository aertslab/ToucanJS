<?php
require dirname(__FILE__)."/../../config.php";

class APIWorkspace {

    private $sessionKey = 'ToucanJS';

    public function __construct () {
        session_start();
        if (!isset($_SESSION[$this->sessionKey])) $_SESSION[$this->sessionKey] = new stdClass;
    }

    public function get() {
        return count($_SESSION[$this->sessionKey]) ? $_SESSION[$this->sessionKey] : new stdClass;
    }

    public function getID() {
        return session_id();
    }

    public function addFile($fileID, $fileName) {
        if (!isset($_SESSION[$this->sessionKey]->files)) $_SESSION[$this->sessionKey]->files = new stdClass;
        if (isset($_SESSION[$this->sessionKey]->files->$fileID)) return false;
        $_SESSION[$this->sessionKey]->files->$fileID = array('id' => $fileID, 'name' => $fileName);
        return true;
    }

    public function deleteFile($fileID) {
        if (!isset($_SESSION[$this->sessionKey]->files->$fileID)) return false;
        unset($_SESSION[$this->sessionKey]->files->$fileID);
        return true;
    }

    public function destroy() {
        unset($_SESSION[$this->sessionKey]);
        $_SESSION[$this->sessionKey] = new stdClass;
    }
}

class API {

    protected $uploadsDir        = CONFIG_DIR_UPLOADS;
/*
    protected $db;
    protected $reCaptchaKey     = CONFIG_RECAPTCHAKEY;
    protected $contactFormTo    = CONFIG_CONTACTFORM_TO;
    protected $contactFormFrom  = CONFIG_CONTACTFORM_FROM;
    protected $dbhost           = CONFIG_DB_HOST;
    protected $dbname           = CONFIG_DB_NAME;
    protected $dbuser           = CONFIG_DB_USER;
    protected $dbpasswd         = CONFIG_DB_PASSWORD;
    protected $molFilesDir      = CONFIG_DIR_MOL;
    protected $blastFilesDir        = CONFIG_DIR_BLAST;
    protected $importFilesDir       = CONFIG_DIR_IMPORT;
    protected $blastRunOnCluster    = CONFIG_BLAST_USE_CLUSTER;
    protected $blastnMaxLength      = CONFIG_BLASTN_MAX_LENGTH;
    protected $blastpMaxLength      = CONFIG_BLASTP_MAX_LENGTH;
    protected $authenticated        = false;
*/
    public function __construct () {
        $this->workspace = new APIWorkspace();
        /*
        try {
            $this->db = new PDO("mysql:dbname=".$this->dbname.";host=".$this->dbhost, $this->dbuser, $this->dbpasswd, array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8",
            ));
        } catch (PDOException $e) {
            echo "DB connection failed: " . $e->getMessage();
        }
        */
    }

    public function get($id, $params) {
        die('Not implemented');
    }

    public function post($id, $params) {
        die('Not implemented');
    }

    public function put($id, $params) {
        die('Not implemented');
    }

    public function delete($id, $params) {
        die('Not implemented');
    }
}

/*
include "blast.php";
include "compound.php";
include "compoundType.php";
include "contact.php";
include "enzyme.php";
include "enzymeType.php";
include "import.php";
include "mol.php";
include "pathway.php";
include "plant.php";
include "plantOrder.php";
*/
include "file.php";
include "workspace.php";

$method = $_SERVER['REQUEST_METHOD'];
$params = $_REQUEST;
$API    = isset($_GET['API']) ? $_GET['API'] : '';
$API    = explode("/", $API);
if (!empty($API[0])) {
    $class = ucfirst($API[0]);
    $class = new $class();
} else {
    $class = new API();
}
$id = isset($API[1]) ? $API[1] : null;
call_user_func_array(array($class, $method), array($id, $params));
