<?php
	class VK{
		public static $app_id = 4261581;
		public static $secret = '';
		public static $api_version = '5.26';
		public static function api($m, $d, $token){
			$d['access_token'] = $token;
			$d['v']=VK::$api_version;
			$d['https'] = 1;
			$resp = VK::post('https://api.vk.com/method/'.$m, $d);
			return $resp;
		}
		static function post($link,$data){
			R::set('counter', R::get('counter')+1);
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $link);
			curl_setopt($ch, CURLOPT_HEADER, false);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
			curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
			curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0); 
			$response = curl_exec($ch);
			curl_close($ch);
			return json_decode($response, true);
		}
	}
?>