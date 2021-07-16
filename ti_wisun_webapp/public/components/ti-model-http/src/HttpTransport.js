/*******************************************************************************
 * Copyright (c) 2017 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Raymond Pang - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
	var myWindow;

	var HttpTransport = function(useProxy) {
		this.connected = false;
		this.conn = {};
		this.useProxy = useProxy;
		this.uriMap = new Map();
		this.requestOutstanding = new Map();
		gc.databind.AbstractPubSubTransport.call(this);
	};

	var PubSubTopicBind = function(name, viewInstance) {
		gc.databind.VariableLookupBindValue.call(this);
		this.setStale(true);
		this.pubsubViewInstance = viewInstance;
	};

	var getEncodedType = function(contentType) {
		if (contentType.includes("application/json")) {
			return "json";
		} else if (contentType.includes("application/x-www-form-urlencoded")) {
			return "urlencoded";
		} else if (contentType.includes("text/plain")) {
			return "text";
		}
	}

	HttpTransport.prototype = new gc.databind.AbstractPubSubTransport();

	HttpTransport.prototype.connect = function(conn) {
		this.conn = conn;
		let url = this.conn.url.trim();
		// never use proxy, when connecting to localhost
		if (url.indexOf('http://localhost') === 0 || url.indexOf('https://localhost') === 0
			|| url.indexOf('http://127.0.0.1') === 0 || url.indexOf('https://127.0.0.1') === 0) {
			this.viaCloud = false;
		}
		else {
			this.viaCloud = (url.indexOf('https:') === 0) ? this.useProxy.https	: this.useProxy.http;
		}
		this.disconnect();
		this.connected = true;
		if (conn.onConnect) {
			conn.onConnect();
		}
		return '';
	};

	HttpTransport.prototype.disconnect = function() {
		if (this.connected) {
			for ( var key in this.uriMap) {
				if (this.uriMap.hasOwnProperty(key)) {
					window.clearInterval(this.uriMap[key].timerID);
				}
			}
			this.uriMap.clear();
			this.connected = false;
		}
		return '';
	};

	HttpTransport.prototype.setUpRequest = function(req, verb, topic) {
		var error = "";
		try {
			if (this.viaCloud) {
				req.open(verb, myWindow.location.origin + "/gc-http-proxy/", true);
				req.setRequestHeader("ti-gc-http-target",
						encodeURIComponent(this.conn.url));
				req.setRequestHeader("ti-gc-http-uri",
						encodeURIComponent(topic.path));
				if (this.conn.userId != "") {
					req.setRequestHeader("ti-gc-http-user-id",
							encodeURIComponent(this.conn.userId));
					req.setRequestHeader("ti-gc-http-password",
							encodeURIComponent(this.conn.password));
				}
			} else {
				var Base64 = {
					_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
					encode : function(e) {
						var t = "";
						var n, r, i, s, o, u, a;
						var f = 0;
						e = Base64._utf8_encode(e);
						while (f < e.length) {
							n = e.charCodeAt(f++);
							r = e.charCodeAt(f++);
							i = e.charCodeAt(f++);
							s = n >> 2;
							o = (n & 3) << 4 | r >> 4;
							u = (r & 15) << 2 | i >> 6;
							a = i & 63;
							if (isNaN(r)) {
								u = a = 64
							} else if (isNaN(i)) {
								a = 64
							}
							t = t + this._keyStr.charAt(s)
									+ this._keyStr.charAt(o)
									+ this._keyStr.charAt(u)
									+ this._keyStr.charAt(a)
						}
						return t
					},
					decode : function(e) {
						var t = "";
						var n, r, i;
						var s, o, u, a;
						var f = 0;
						e = e.replace(/[^A-Za-z0-9+/=]/g, "");
						while (f < e.length) {
							s = this._keyStr.indexOf(e.charAt(f++));
							o = this._keyStr.indexOf(e.charAt(f++));
							u = this._keyStr.indexOf(e.charAt(f++));
							a = this._keyStr.indexOf(e.charAt(f++));
							n = s << 2 | o >> 4;
							r = (o & 15) << 4 | u >> 2;
							i = (u & 3) << 6 | a;
							t = t + String.fromCharCode(n);
							if (u != 64) {
								t = t + String.fromCharCode(r)
							}
							if (a != 64) {
								t = t + String.fromCharCode(i)
							}
						}
						t = Base64._utf8_decode(t);
						return t
					},
					_utf8_encode : function(e) {
						e = e.replace(/rn/g, "n");
						var t = "";
						for (var n = 0; n < e.length; n++) {
							var r = e.charCodeAt(n);
							if (r < 128) {
								t += String.fromCharCode(r)
							} else if (r > 127 && r < 2048) {
								t += String.fromCharCode(r >> 6 | 192);
								t += String.fromCharCode(r & 63 | 128)
							} else {
								t += String.fromCharCode(r >> 12 | 224);
								t += String.fromCharCode(r >> 6 & 63 | 128);
								t += String.fromCharCode(r & 63 | 128)
							}
						}
						return t
					},
					_utf8_decode : function(e) {
						var t = "";
						var n = 0;
						var r = c1 = c2 = 0;
						while (n < e.length) {
							r = e.charCodeAt(n);
							if (r < 128) {
								t += String.fromCharCode(r);
								n++
							} else if (r > 191 && r < 224) {
								c2 = e.charCodeAt(n + 1);
								t += String.fromCharCode((r & 31) << 6 | c2
										& 63);
								n += 2
							} else {
								c2 = e.charCodeAt(n + 1);
								c3 = e.charCodeAt(n + 2);
								t += String.fromCharCode((r & 15) << 12
										| (c2 & 63) << 6 | c3 & 63);
								n += 3
							}
						}
						return t
					}
				}
				req.open(verb, this.conn.url + topic.path, true);
				if (this.conn.userId && this.conn.userId != "") {
					var auth = "Basic " + Base64
							.encode(encodeURIComponent(this.conn.userId) + ":"
									+ encodeURIComponent(this.conn.password));
					req.setRequestHeader("Authorization", auth);
				}
			}
		} catch (e) {
			error = e;
		}
		return error;
	};

	HttpTransport.prototype.subscribe = function(topic, opt) {
		var error = '';
		if (this.connected) {
			var that = this;
			var uri = {
				url : topic.path
			};
			if ( this.conn.pollInterval !== undefined && this.conn.pollInterval >= 0)
			{
				uri.timerID = window.setInterval(handleTimer,this.conn.pollInterval);
			}
			this.uriMap[topic.name] = uri;
			this.requestOutstanding[topic.name] = false;

			function handleTimer() {
				if (!that.requestOutstanding[topic.name]) {
					var req = new XMLHttpRequest();
					req.onreadystatechange = function() {
						if (req.readyState == XMLHttpRequest.DONE) {
							that.requestOutstanding[topic.name] = false;
							if (req.status == 200) {
								var contentType = req
										.getResponseHeader("Content-type");
								var encodedType = getEncodedType(contentType);
								if (encodedType !== undefined) {
									var msg = {
										destinationName : topic.name,
										type : encodedType,
										payloadString : req.response
									};
									that.conn.onMessageArrived(msg);
								} else {
									that.conn.onFailure("Subscribe URI "
											+ topic.name
											+ ": Unsupported content type "
											+ contentType);
									window.clearInterval(uri.timerID);
								}
							} else {
								that.conn.onFailure("Failed to retrieve '" + that.conn.modelId + '.' + topic.name + "': " + req.status + " - " + req.statusText + " - " + req.responseText)
							}
						}
					};
					error = that.setUpRequest(req, "GET", topic);
					if (error == "") {
						that.requestOutstanding[topic.name] = true;
						try
						{
							req.send();
						} catch (e) {
							error = e;
						}
					}
				}
			}
			
			handleTimer();
		}
		return error;
	};

	HttpTransport.prototype.unsubscribe = function(topic, opt) {
		var error = '';
		if (this.connected) {
			try {
				var uri = this.uriMap[topic.name];
				if (uri !== undefined) {
					window.clearInterval(uri.timerID);
					this.uriMap[topic.name] = undefined;
				}
			} catch (e) {
				error = e;
			}
			;
		}
		return error;
	};

	HttpTransport.prototype.publish = function(topic, payload, opt) {
		var encodeType = undefined;
		switch(topic.type) {
			case 'json':
				encodeType = 'application/json';
				break;
			case 'urlencoded':
				encodeType = 'application/x-www-form-urlencoded';
				break;
			case 'text':
				encodeType = 'text/plain';
				break;
		}

		if (encodeType !== undefined) {
			var formData = "";
			var req = new XMLHttpRequest();
			req.onreadystatechange = function() {
				if (req.readyState == XMLHttpRequest.DONE && req.status == 200) {
					// alert(req.responseText);
				}
			}
			if (topic.type == "urlencoded") {
				try {
					var data = JSON.parse(payload);
					for ( var key in data) {
						if (data.hasOwnProperty(key)) {
							if (formData != "") {
								formData += "&";
							}
							formData += encodeURIComponent(key),
									formData += "=";
							formData += encodeURIComponent(data[key]);
						}
					}
				} catch (e) {
					return "Publish URI " + topic.name + ": Invalid payload: "
							+ e;
				}
			} else {
				formData = payload;
			}
			var error = this.setUpRequest(req, "POST", topic);
			if (error != "") {
				return error;
			}
			req.setRequestHeader("Content-type", encodeType);
			try {
				req.send(formData);
			} catch (e) {
				alert(e);
			}
		} else {
			return "Publish URI " + topic.name + ": Unsupported content type "
					+ topic.contentType;
		}
		return "";
	};

	gc.databind.CreateHttpTransport = function(windowObj) {
		myWindow = windowObj;
		let name = (myWindow.location.protocol == 'https:') ? 'hybrid' : 'browser';

		if (name === "browser")
			return new HttpTransport({
				http : false,
				https : false
			});
		else if (name === "cloud")
			return new HttpTransport({
				http : true,
				https : true
			});
		else if (name === "hybrid")
			return new HttpTransport({
				http : true,
				https : false
			});
		return undefined;
	};

}());
