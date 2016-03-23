/**
 * angular-oauth2 - Angular OAuth2
 * @version v2.1.0
 * @link https://github.com/seegno/angular-oauth2
 * @license MIT
 */
(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([ "angular", "query-string" ], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(require("angular"), require("query-string"));
    } else {
        root.angularOAuth2 = factory(root.angular, root.queryString);
    }
})(this, function(angular, queryString) {
    var ngModule = angular.module("angular-oauth2", [ "ipCookie" ]).config(oauthConfig).factory("oauthInterceptor", oauthInterceptor).provider("OAuth", OAuthProvider).provider("OAuthToken", OAuthTokenProvider);
    function oauthConfig($httpProvider) {
        $httpProvider.interceptors.push("oauthInterceptor");
    }
    oauthConfig.$inject = [ "$httpProvider" ];
    var _prototypeProperties = function(child, staticProps, instanceProps) {
        if (staticProps) Object.defineProperties(child, staticProps);
        if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
    };
    var defaults = {
        baseUrl: null,
        clientId: null,
        clientSecret: null,
        grantPath: "/oauth2/token",
        revokePath: "/oauth2/revoke"
    };
    var requiredKeys = [ "baseUrl", "clientId", "grantPath", "revokePath" ];
    function OAuthProvider() {
        var config;
        this.configure = function(params) {
            if (config) {
                throw new Error("Already configured.");
            }
            if (!(params instanceof Object)) {
                throw new TypeError("Invalid argument: `config` must be an `Object`.");
            }
            config = angular.extend({}, defaults, params);
            angular.forEach(requiredKeys, function(key) {
                if (!config[key]) {
                    throw new Error("Missing parameter: " + key + ".");
                }
            });
            if ("/" === config.baseUrl.substr(-1)) {
                config.baseUrl = config.baseUrl.slice(0, -1);
            }
            if ("/" !== config.grantPath[0]) {
                config.grantPath = "/" + config.grantPath;
            }
            if ("/" !== config.revokePath[0]) {
                config.revokePath = "/" + config.revokePath;
            }
            return config;
        };
        this.$get = function($http, OAuthToken) {
            var OAuth = function() {
                function OAuth() {
                    if (!config) {
                        throw new Error("`OAuthProvider` must be configured first.");
                    }
                }
                _prototypeProperties(OAuth, null, {
                    isAuthenticated: {
                        value: function isAuthenticated() {
                            return !!OAuthToken.token;
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    getAccessToken: {
                        value: function getAccessToken(user, options) {
                            if (!user || !user.username || !user.password) {
                                throw new Error("`user` must be an object with `username` and `password` properties.");
                            }
                            var data = {
                                client_id: config.clientId,
                                grant_type: "password",
                                username: user.username,
                                password: user.password
                            };
                            if (null !== config.clientSecret) {
                                data.client_secret = config.clientSecret;
                            }
                            data = queryString.stringify(data);
                            options = angular.extend({
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                }
                            }, options);
                            return $http.post("" + config.baseUrl + "" + config.grantPath, data, options).then(function(response) {
                                response.data.targetUrl = config.baseUrl;
                                OAuthToken.token = response.data;
                                return response;
                            });
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    getRefreshToken: {
                        value: function getRefreshToken() {
                            var data = {
                                client_id: config.clientId,
                                grant_type: "refresh_token",
                                refresh_token: OAuthToken.getRefreshToken()
                            };
                            if (null !== config.clientSecret) {
                                data.client_secret = config.clientSecret;
                            }
                            data = queryString.stringify(data);
                            var options = {
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                }
                            };
                            return $http.post("" + config.baseUrl + "" + config.grantPath, data, options).then(function(response) {
                                response.data.targetUrl = config.baseUrl;
                                OAuthToken.token = response.data;
                                return response;
                            });
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    revokeToken: {
                        value: function revokeToken() {
                            var data = queryString.stringify({
                                token: OAuthToken.getRefreshToken() ? OAuthToken.getRefreshToken() : OAuthToken.getAccessToken()
                            });
                            var options = {
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                }
                            };
                            return $http.post("" + config.baseUrl + "" + config.revokePath, data, options).then(function(response) {
                                OAuthToken.removeToken();
                                return response;
                            });
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    }
                });
                return OAuth;
            }();
            return new OAuth();
        };
        this.$get.$inject = [ "$http", "OAuthToken" ];
    }
    var _prototypeProperties = function(child, staticProps, instanceProps) {
        if (staticProps) Object.defineProperties(child, staticProps);
        if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
    };
    function OAuthTokenProvider() {
        var storage;
        var config = {
            name: "token",
            storage: "cookies",
            options: {
                secure: true
            }
        };
        this.configure = function(params) {
            if (!(params instanceof Object)) {
                throw new TypeError("Invalid argument: `config` must be an `Object`.");
            }
            angular.extend(config, params);
            return config;
        };
        this.$get = function(ipCookie, $window) {
            var OAuthToken = function() {
                function OAuthToken() {}
                _prototypeProperties(OAuthToken, null, {
                    token: {
                        set: function(data) {
                            return setToken(data);
                        },
                        get: function() {
                            return getToken();
                        },
                        enumerable: true,
                        configurable: true
                    },
                    getAccessToken: {
                        value: function getAccessToken() {
                            return this.token ? this.token.access_token : undefined;
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    getAuthorizationHeader: {
                        value: function getAuthorizationHeader() {
                            if (!(this.getTokenType() && this.getAccessToken())) {
                                return;
                            }
                            return "" + (this.getTokenType().charAt(0).toUpperCase() + this.getTokenType().substr(1)) + " " + this.getAccessToken();
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    getRefreshToken: {
                        value: function getRefreshToken() {
                            return this.token ? this.token.refresh_token : undefined;
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    getTokenType: {
                        value: function getTokenType() {
                            return this.token ? this.token.token_type : undefined;
                        },
                        writable: true,
                        enumerable: true,
                        configurable: true
                    },
                    removeToken: {
                        value: function(_removeToken) {
                            var _removeTokenWrapper = function removeToken() {
                                return _removeToken.apply(this, arguments);
                            };
                            _removeTokenWrapper.toString = function() {
                                return _removeToken.toString();
                            };
                            return _removeTokenWrapper;
                        }(function() {
                            return removeToken();
                        }),
                        writable: true,
                        enumerable: true,
                        configurable: true
                    }
                });
                return OAuthToken;
            }();
            var setToken = function(data) {
                storage = config.storage.toLowerCase();
                switch (storage) {
                  case "cookies":
                    return ipCookie(config.name, data, config.options);

                  case "localstorage":
                    return $window.localStorage.setItem(config.name, angular.toJson(data));

                  case "sessionstorage":
                    return $window.sessionStorage.setItem(config.name, angular.toJson(data));

                  default:
                    return ipCookie(config.name, data, config.options);
                }
            };
            var getToken = function() {
                storage = config.storage.toLowerCase();
                switch (storage) {
                  case "cookies":
                    return ipCookie(config.name);

                  case "localstorage":
                    return angular.fromJson($window.localStorage.getItem(config.name));

                  case "sessionstorage":
                    return angular.fromJson($window.sessionStorage.getItem(config.name));

                  default:
                    return ipCookie(config.name);
                }
            };
            var removeToken = function() {
                storage = config.storage.toLowerCase();
                switch (storage) {
                  case "cookies":
                    return ipCookie.remove(config.name, config.options);

                  case "localstorage":
                    return $window.localStorage.removeItem(config.name);

                  case "sessionstorage":
                    return $window.sessionStorage.removeItem(config.name);

                  default:
                    return ipCookie.remove(config.name, config.options);
                }
            };
            return new OAuthToken();
        };
        this.$get.$inject = [ "ipCookie", "$window" ];
    }
    function oauthInterceptor($q, $rootScope, OAuthToken) {
        return {
            request: function(config) {
                if (OAuthToken.getAuthorizationHeader()) {
                    if (config.url.indexOf(OAuthToken.token.targetUrl) !== -1 && config.url.indexOf("/oauth/token") === -1 || config.url.indexOf("/oauth/token") !== -1 && config.method !== "POST") {
                        config.headers = config.headers || {};
                        config.headers.Authorization = OAuthToken.getAuthorizationHeader();
                    }
                }
                return config;
            },
            responseError: function(rejection) {
                if (400 === rejection.status && rejection.data && ("invalid_request" === rejection.data.error || "invalid_grant" === rejection.data.error)) {
                    OAuthToken.removeToken();
                    $rootScope.$emit("oauth:error", rejection);
                }
                if (401 === rejection.status && rejection.data && "invalid_token" === rejection.data.error) {
                    $rootScope.$emit("oauth:error", rejection);
                }
                return $q.reject(rejection);
            }
        };
    }
    oauthInterceptor.$inject = [ "$q", "$rootScope", "OAuthToken" ];
    return ngModule;
});