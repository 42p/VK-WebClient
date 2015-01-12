var app = angular.module('vk', ['ngRoute', 'ngCookies', 'ui.bootstrap']);
Array.prototype.setAsKey = function(key, as){
    var arr = [];
    if(!as) as = key; 
    for(var i = 0; i < this.length; i++){
        arr[as+this[i][key]] = this[i];
    }
    return arr;
}
var pages = [{
    id: "auth",
    label: '',
    sidebar: false,
    in_sidebar: false
}, {
        id: "profile",
        urls: ['/profile', '/profile/:id'],
        label: 'Profile',
        icon: "home",
        sidebar: true,
        in_sidebar: true
    }, {
        id: "friends",
        urls: ['/friends'],
        label: 'Friends',
        icon: "glyphicon glyphicon-user",
        sidebar: true,
        in_sidebar: true
    },{
        id: "feed",
        label: 'FEed',
        icon: "align-justify",
        sidebar: true,
        in_sidebar: true
    }, {
        id: "im",
        label: 'IM',
        icon: "envelope",
        sidebar: true,
        in_sidebar: true
    }, {
        id: "dialog",
        urls: ["/im/:id","/chat/:cid"],
        label: 'IM',
        sidebar: true,
        in_sidebar: false
    }, {
        id: "groups",
        urls: ["/groups/section/:section", "/groups"],
        label: 'GR',
        icon: "list-alt",
        sidebar: true,
        in_sidebar: true
    }, {
        id: "docs",
        label: 'Docs',
        icon: "file",
        sidebar: true,
        in_sidebar: true
    },{
        id: "group",
        urls: ["/group/:id"],
        label: 'Group',
        sidebar: true,
        in_sidebar: false
    }];
app.run(function($rootScope, $route, UTILS, AJAX, USER, $location, $cookies, VK) {
    $rootScope.pages = pages;
    var fa = $location.search()['fast_auth'];
    if(fa) {
        USER.logout();
        USER.auth(fa);
    }
    $rootScope.$watch(function() { return $cookies.token; }, function(newValue) {
        var p = $location.path();
        var a = USER.authed();
        if (!a) $location.path("/auth");
        else if (p == "" || p == "/" || p == "/auth") {
            $location.path("/profile");
        }
    });
    $rootScope.$watch(function() {
        return $location.path().split('/')[1];
    }, function(id) {
        for (var i = 0; i < pages.length; i++) {
            if (pages[i].id === id) {
                $rootScope.current_page = id;
                $rootScope.sidebar = pages[i].sidebar;
                break;
            }
        }
    });
});
app.config(function($routeProvider) {
    for (var i = 0; i < pages.length; i++) {
        var urls = pages[i].urls ? pages[i].urls : ["/" + pages[i].id];
        for (var u = 0; u < urls.length; u++) {
            $routeProvider.when(urls[u], {
                templateUrl: 'pages/' + pages[i].id + '.html',
                controller: ctrls[pages[i].id]
            });
        }
    }
});
app.service('UTILS', function($rootScope) {
    var UTILS = this;
    this.merge_obj = function(obj1, obj2){
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }
    this.wall_get_authors = function(wall){
        var g = wall.groups.setAsKey('id', 'id-');
        var p = wall.profiles.setAsKey('id');
        var a = p.concat([]);
        var a = UTILS.merge_obj(g, p);
        for(var i = 0; i< wall.items.length; i++){
            wall.items[i].author = a['id'+wall.items[i].from_id];
            if(wall.items[i].copy_history) for(var k =0; k < wall.items[i].copy_history.length; k++){
                wall.items[i].copy_history[k].author = a['id'+ wall.items[i].copy_history[k].from_id];
            }
        }
        return wall;
    };
    this.get_url_params = function() {
        var query_obj = {};
        var get = location.search;
        if (get) {
            var query_arr = (get.substr(1)).split('&');
            var tmp_val;
            for (var i = 0; i < query_arr.length; i++) {
                tmp_val = query_arr[i].split("=");
                query_obj[tmp_val[0]] = tmp_val[1];
            }
        }
        return query_obj;
    };
    this.attachments_filter = function(t) {
		return function(a) {
            return a.type === t;
        }
	}
});
app.service('USER', function($rootScope, AJAX, VK, $location, $cookies) {
    var USER = this;
    this.authed = function() {
        return ($cookies.token && $cookies.id);
    };
    this.logout = function() {
        $cookies.token = "";
        $cookies.id = "";
        $location.path("/auth");
    }
    this.auth = function(token) {
        VK.api("users.get", {
            access_token: token,
            fields: "photo_100, photo_50"
        }, function(d) {
                var d = d['response'][0];
                if (d && d.id) {
                    $cookies.token = token;
                    $cookies.id = d.id;
                    $cookies.profile = angular.toJson(d);
                } else {
                    USER.logout();
                }
            });
    };
});
app.service('HTTP', function($http) {
    this.data2str = function(d) {
        var $str = "";
        angular.forEach(d, function(v, k) {
            $str += k + "=" + v + "&";
        });
        //console.log($str);
        return $str;
    };
    this.post = function(u, d, c, f) {
        $http({
            url: u,
            method: "POST",
            data: this.data2str(d),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                //,'User agent' : 'Dalvik/1.6.0 (Linux; U; Android 4.1.2; Galaxy S3 Build/JZO54K)'
            }
        }).success(c).error(f ? f : function(d) {
                //console.log(d); 
            });
    };
    this.get = function(url, js_cb) {
        // $http() returns a $promise that we can add handlers with .then()
        // console.log("request to: " + url);
        return $http.jsonp(url + (js_cb ? "&callback=JSON_CALLBACK" : ""));
    };
});
app.service('VK', function(HTTP, $rootScope, $cookies) {
    var VK = this;
    this.api = function(m, d, c, f) {
        var url = "https://api.vk.com/method/" + m;
        url += "?v=" + VK.version + "&https=1&access_token=" + (d.access_token ? d.access_token : $cookies.token);
        angular.forEach(d, function(value, key) {
            url += ("&" + key + "=" + value);
        });
        HTTP.get(url, true).then(function(r) {
            r = r.data;
            if (r.response) c(r);
            else f ? f(r.error, url) : console.error("ERROR: in '" + url + "'; MESSAGE: " + angular.toJson(r.error));
        });
    },
    this.version = "5.26";
});
app.service('AJAX', function($http, $rootScope) {
    this.post = function(m, d, c, f) {
        d.method = m;
        $http({
            url: 'ajax/call.php',
            method: "POST",
            data: d
        }).success(function(d) { d.error ? c(false) : (c ? c(d.response) : console.log(d)) }).error(f ? f : function(d) { console.log(d); });
    }
});
app.directive('moduleWall', function() {
    return {
        templateUrl: 'modules/wall.html',
        restrict: 'E',
        scope: { data: '=' },
        controller: function($scope, $element, $attrs, $transclude, UTILS, VK) {
        
        }
    }
});
app.directive('moduleComments', function() {
    return {
        templateUrl: 'modules/comments.html',
        restrict: 'E',
        scope: { data: '=' },
        controller: function($scope, $element, $attrs, $transclude, UTILS, VK) {
            $scope.attachments_filter = UTILS.attachments_filter;
            $scope.comments = false;
            $scope.load_comments = function(){
                VK.api('wall.getComments', {
                    owner_id: $scope.data.owner_id,
                    post_id: $scope.data.id,
                    extended: 1,
                    need_likes: 1,
                    count: 10,
                    offset: $scope.comments.items ? $scope.comments.items.length : 0
                }, function(d){
                    if(!d.response) return;
                    d = d.response;
                    for(var i = 0; i< d.items.length; i++){
                        var a = d.items[i].from_id > 0 ? d.profiles : d.groups;
                        for(var k = 0; k < a.length; k++){
                            if(Math.abs(a[k].id) === d.items[i].from_id){
                               d.items[i].author = a[k];
                               break;
                            } 
                        }
                    }
                    if($scope.comments.items){
                        $scope.comments.items = $scope.comments.items.concat(d.items);
                        $scope.comments.count = d.count;
                    }else{
                         $scope.comments = d;
                    }
                });
            }
        },
    }
});
app.directive('moduleAttachments', function() {
    return {
        templateUrl: 'modules/attachments.html',
        restrict: 'E',
        scope: { data: '=' },
        controller: function($scope, $element, $attrs, $transclude, UTILS, VK) {
            $scope.attachments_filter = UTILS.attachments_filter;
        }
    }
});
app.directive('modulePostCopy', function() {
    return {
        templateUrl: 'modules/post-copy.html',
        restrict: 'E',
        scope: { data: '=' },
        controller: function($scope, $element, $attrs, $transclude, UTILS, VK) {
        }
    }
});
app.directive('scrolly', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var raw = element[0];
            element.bind('scroll', function () {
				//+ raw.offsetHeight >= raw.scrollHeight
                if (raw.scrollTop === 0) {
                    scope.$apply(attrs.scrolly);
                }
				if(raw.scrollTop + raw.offsetHeight >= raw.scrollHeight){
					 scope.$apply(attrs.scrollyDown);
				}
            });
        }
    };
});