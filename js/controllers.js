var ctrls = {
	main: function($scope) {

	},
	auth: function($scope, USER, AJAX) {
		$scope.token = "";
		$scope.auth = function() {
			USER.auth($scope.token);
		};
		$scope.tokens = [];
	},

	profile: function($scope, $route, $sce, $modal, $cookies, VK, UTILS) {
		$scope.get = function(id){
			VK.api('execute.profile', {
				id: id,
				wall_count: 10
			}, function(d){
				$scope.profile = d.response.profile;
				$scope.wall = d.response.wall;
				$scope.wall.owner = d.response.profile;
				$scope.photos = d.response.photos;	
				$scope.friends = d.response.friends;
				if($scope.wall.items) UTILS.wall_get_authors($scope.wall);
				console.log($scope.wall);
			});
		};
		$scope.get($route.current.params.id ? $route.current.params.id : $cookies.id);
	
	},
	
	friends: function($scope, VK){
		$scope.friends = [];
		VK.api('friends.get', {
			fields: "photo_50, photo_100"
		}, function(data){
				$scope.friends = data.response.items;
		});
	},

	feed: function($scope) {

	},

	im: function($scope, $rootScope,$location, VK, $sce, USER, $cookies){
		$scope.USER = angular.fromJson($cookies.profile);
		$scope.e =  angular.element(document.querySelector('#loader'));
		$scope.ui = {
			scroll: angular.element(document.querySelector('#scrollDown')),
			scrollHeight: 0
		}
		$scope.config = {
			messages_loading_step : 15,
			dialogs_loading_step : 20
		}
		$scope.storage = {
			dialogs_offset: 0,
			dialogs_count: 0,
			dialogs : [],
			users: []
		};
		$scope.dialog = false;
		$scope.utils = {
			getUserName: function(i){
				if($scope.storage.users[i]) return $scope.storage.users[i].first_name + ' ' + $scope.storage.users[i].last_name;
				else return 'undefined';
			},
			getUserSex: function(i){
				if($scope.storage.users[i]) return $scope.storage.users[i].sex;
				else return 0;
			}
		};
		$scope.openDialog = function(d){
			if(d.chat_id) $location.path('/chat/'+d.chat_id);
			else $location.path('/im/'+d.user_id);
		};
		$scope.getDialogTitle = function(i){
			var dialog = $scope.storage.dialogs[i];
			if(dialog.message.title && dialog.message.title != ' ... ') return dialog.message.title;
			var u = $scope.storage.users[dialog.message.user_id];
			return u.first_name+' '+u.last_name;
		};
		$scope.onDialogsScroll = function(){
			$scope.getDialogs(function(d){
				$scope.storage.dialogs = $scope.storage.dialogs.concat(d);
			});
		};
		$scope.getDialogs = function (c){
			VK.api('messages.getDialogs', {preview_length: 30, offset :  $scope.storage.dialogs_offset, count:  $scope.config.dialogs_loading_step}, function(data){
				if(!data.response.items) return; 
				$scope.storage.dialogs_count = data.response.count;
				
				var dialogs = data.response.items;
				var ids = [];
				for(var i =0; i< dialogs.length; i++){ 
					ids.push(dialogs[i].message.user_id);
				}
				VK.api('users.get', {user_ids: ids, fields: 'photo_50'}, function(data){
					var u = data.response;
					u.push($scope.USER);
					for(var k=0; k < u.length; k++){
							$scope.storage.users[u[k].id] = u[k];
					}
					$scope.storage.dialogs_offset = $scope.storage.dialogs_offset+ $scope.config.dialogs_loading_step;
					c(dialogs); 
				});
			});
		}; 
		($scope.init = function(){
				$scope.getDialogs(function(d){
					$scope.storage.dialogs = d;	
				});
		})();
	},
	dialog : function($scope, VK, $route, $cookies){
		$scope.USER = angular.fromJson($cookies.profile);
		$scope.users = {
			
		};
		$scope.users[$scope.USER.id] = $scope.USER;
		$scope.messages_count = 0;
		$scope.history = [];
		$scope.offset = 0;
		$scope.ui = {
			scroll: angular.element(document.querySelector('#scrollDown')),
			scrollHeight: 0
		};
		if($route.current.params.cid){
			VK.api('messages.getChat', {chat_id: $route.current.params.cid, fields: 'photo_50'}, function(data){
				var u = data.response.users;
				for(var k=0; k < u.length; k++){
						$scope.users[u[k].id] = u[k];
				}
			});
		}else{
			VK.api('users.get', {user_ids: $route.current.params.id, fields: 'photo_50'}, function(data){
				if(!data.response) return;
				$scope.users[data.response[0].id] = data.response[0];
			});
		}
		$scope.onDialogScroll = function(){
			$scope.getHistory(function(){
					$scope.ui.scroll[0].scrollTop = $scope.ui.scroll[0].scrollHeight - $scope.ui.scrollHeight;
					$scope.ui.scrollHeight = $scope.ui.scroll[0].scrollHeight;
			});
		};
		$scope.getHistory = function(c){
				var p = {
					count: 30,
					offset: $scope.offset
					//rev: 1
				}
				console.log($route.current.params);
				if($route.current.params.cid){
					p['chat_id'] = $route.current.params.cid;
				}else{
					p['user_id'] = $route.current.params.id;
				}
				$scope.offset += 30;
				VK.api('messages.getHistory', p, function(data){
					if(!data.response.items) return;
					$scope.messages_count = data.response.count;
					$scope.history = data.response.items.reverse().concat($scope.history);
					c();
				});
		};
		$scope.getMessageText = function(i){
			var m = $scope.history[i];
			if(m.attachments){
				$scope.history[i].attach = {
					photo: [],
					audio: [],
					video: [],
					doc: [],
					wall: [],
					wall_reply : [],
					sticker: []
				};
				for(var k = 0; k< m.attachments.length; k++){
					$scope.history[i].attach[m.attachments[k].type].push(m.attachments[k]);
				}
			}
			if(m.body) return m.body;
		};
		$scope.getMessageAction = function(i){
			var m = $scope.history[i];
			if(m.action){
				switch(m.action){
					case 'chat_create' : 
						return $scope.utils.getUserName($scope.message.admin_id) + ' создал' + ($scope.utils.getUserSex($scope.dialog.message.admin_id) === 1? 'а ' :' ') + 'беседу "'+$scope.dialog.message.title+'"'; 
					break;
					case 'chat_photo_update' :
						return '';
					break;  
					case 'chat_photo_remove' : 
						return '';
					break;  
					case 'chat_title_update' : 
						return '';
					break;  
					case 'chat_invite_user' : 
						return '';
					break;  
					case 'chat_kick_user' : 
						return $scope.utils.getUserName($scope.message.action_mid) + ' покинул'+($scope.utils.getUserSex($scope.dialog.message.action_mid) === 1? 'а ' :' ') + 'беседу';
					break;  
				}
			}
			return '';
		};
		$scope.getHistory(function(){
			$scope.ui.scroll.ready(function(){
				setTimeout(function(){
					console.log($scope.ui.scroll[0].scrollTop + "  _ " +($scope.ui.scroll[0].scrollHeight - $scope.ui.scroll[0].offsetHeight));
					$scope.ui.scroll[0].scrollTop = $scope.ui.scroll[0].scrollHeight;
				}, 100);
				
			});
		});
		$scope.utils = {
			getUserName: function(i){
				if($scope.storage.users[i]) return $scope.storage.users[i].first_name + ' ' + $scope.storage.users[i].last_name;
				else return 'undefined';
			},
			getUserSex: function(i){
				if($scope.storage.users[i]) return $scope.storage.users[i].sex;
				else return 0;
			}
		};
	},
	
	groups: function($scope, VK, $route) {
		$scope.count = 0;
		$scope.current_section = $route.current.params.section;
		$scope.sections = {
			all: {
				l: "All"
			},
			moder: {
				l: "Admininstation"
			},
			groups: {
				l: "Groups"
			},
			publics: {
				l: "Publics"
			}

		};
		if (!$scope.current_section) {
			for (var def in $scope.sections) break;
			$scope.current_section = Object.keys($scope.sections)[0];;
		}
		$scope.groups = [];
		$scope.get = function(o) {
			if (!o) o = $scope.groups.length;
			var f = $scope.current_section === 'all' ? '' : $scope.current_section;
			VK.api('groups.get', {
				filter: (f ? f : ''),
				offset: o,
				extended: 1,
				count: 100,
				fields: 'members_count,status'
			}, function(d) {
				if (!d.response.items) console.log("ERROR");
				else {
					$scope.groups = $scope.groups.concat(d.response.items);
					$scope.count = d.response.count;
				}
			});
		}
		$scope.get(0);
	},

	group: function($scope, $route, $sce, $modal, VK, UTILS) {
		$scope.group;
		$scope.photos = [];
		$scope.wall = [];
		$scope.main_wiki = {};
		$scope.members = [];
		$scope.boxes = {
			invite_friend: {
				size: '',
				controller: function($scope, $modalInstance, VK, data, $sce) {
					$scope.response = data;
					$scope.selected = [];
					$scope.friends = [];
					$scope.invite_add = function(i){
						$scope.friends[i].selected = true;
						var f = $scope.friends[i];
						f.i = i;
						$scope.selected.push(f);
					};
					$scope.invite_remove = function(i){
						$scope.friends[$scope.selected[i].i].selected = false;
						$scope.selected.splice(i, 1);
					}
					VK.api('friends.get', {
						fields: 'photo_50'
					}, function(d){
						if(!d.response.items) return;
						$scope.friends = d.response.items;
						VK.api('groups.getMembers', {
							group_id: data.group_id,
							filters: 'friends',
							fields: 'photo_50'
						}, function(d2){
							if(!d2.response.items) return;
							var in_group = d2.response.items;
							for(var i =0; i < $scope.friends.length; i++){
								for(var j = 0; j< in_group.length; j++){
									if($scope.friends[i].id === in_group[j].id) $scope.friends.splice(i, 1);
								}
							}
						});
					});
					$scope.ok = function() {
						$modalInstance.close($scope.response);
					};
	
					$scope.cancel = function() {
						$modalInstance.dismiss('cancel');
					};
				},
				on_open: function(){
					return {group_id: $scope.group.id};
				},
				on_close: function(response){
					console.log(response);
				}
			}
		}
		$scope.box_open = function(box) {
			var instance = $modal.open({
				templateUrl: box,
				controller: $scope.boxes[box].controller,
				size: $scope.boxes[box].size,
				resolve: {
					data: $scope.boxes[box].on_open
				}
			});
			instance.result.then(function(r) {
				$scope.boxes[box].on_close(r);
			}, function() {
				
			});
		};
		
		$scope.get = function(id) {
			VK.api('execute.group', {
				id: id,
				wall_count: 20
			}, function(d) {
				if (!d.response.group) console.log("ERROR");
				$scope.group = d.response.group;
				$scope.main_wiki = d.response.wiki;
				$scope.members = d.response.members;
				$scope.wall = d.response.wall;
				$scope.wall.owner = $scope.group;
				$scope.wall.owner.id = -$scope.wall.owner.id;
				$scope.photos = d.response.photos.items;
				UTILS.wall_get_authors($scope.wall);
			});
		};
		$scope.get($route.current.params.id);

	},
	
	docs: function($scope, USER, VK){
		$scope.docs = [];
		$scope.get = function(){
			VK.api('docs.get', {}, function(d){
				console.log(d);
				$scope.docs = d.response.items;
			});
		};
		$scope.get();
	}
}