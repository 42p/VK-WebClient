<?php
	$r = $_SERVER['DOCUMENT_ROOT'];
	include($r.'\core\Utils.class.php');
	include($r.'\core\Database.class.php');
	include($r.'\core\Ajax.class.php');
	include($r.'\core\Registry.class.php');
	include($r.'\core\VK.class.php');
	session_start();
	R::set('db', new Database(DB_TABLE, DB_USERNAME, DB_PASSWORD));
	R::set('config', Utils::parse_config(R::get('db')->getRows('config')));
	R::set('vk', new VK());
	
	new Ajax();
?>