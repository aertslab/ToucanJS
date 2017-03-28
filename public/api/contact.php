<?php
include (dirname(__FILE__)."/../assets/libs/autoload.php");

class Contact extends API {

	public function post($id, $params) {
		$contact = json_decode(file_get_contents("php://input"));
		$recaptcha = new \ReCaptcha\ReCaptcha($this->reCaptchaKey);
		$response = $recaptcha->verify($params['captcha']);
		if ($response->isSuccess()) {
			$to = $this->contactFormTo;
			$subject = '[TriForC] Contact Form';
			$message =
			'Name: '. $contact->name . ' ( '. $contact->email . " ) \n".
			'Subject: '. $contact->subject . "\n".
			'Message: '."\n". $contact->message . "\n";
			$headers =
			'From: TriForC Webform <'.$this->contactFormFrom.'>'."\r\n".
			'Reply-To: ' . $contact->email . "\r\n".
			'X-Mailer: PHP/' . phpversion();
			mail($to, $subject, $message, $headers);
			$message = "Your message has been sent.";
			$success = 1;
		} else {
			$message = "The reCAPTCHA was not valid. Please try again.";
			$success = 0;
		}
		echo json_encode(array(
			"message" => $message,
			"success" => $success,
		));
	}
}