<?php
class Mol extends API {

	public function get($file, $params) {
		if (!empty($file)) {
			$file = explode(".", $file);
			$id = $file[0];
			$type = isset($file[1]) ? $file[1] : 'svg';
			$image = FALSE;
			$image = @file_get_contents($this->molFilesDir.$id.".".$type);
			if (($image === FALSE) && ($type == 'svg')) {
				$image = file_get_contents($this->molFilesDir."no-image.svg");
			}
			if ($type == 'svg') {
				header("Content-Type: image/svg+xml");
			} else {
				header("Content-Type: text/plain");
			}
			echo $image;
		}
	}
}