String.prototype.format = String.prototype.format || function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g, function(match, number) { 
		return typeof args[number] != "undefined" ? args[number] : match;
	});
};

Array.prototype.remove = function(what) {
	while ((i = this.indexOf(what)) !== -1) {
		this.splice(i, 1);
	}
	return this;
};

Node.prototype.remove = Element.prototype.remove || function() {
	this.parentNode.removeChild(this);
}

Node.prototype.removeAll = function() {
	while (this.hasChildNodes()) {
		this.removeChild(this.lastChild);
	}
}

Storage.prototype.setObject = function(key, value) {
	this.setItem(key, JSON.stringify(value));
}
 
Storage.prototype.getObject = function(key) {
	return JSON.parse(this.getItem(key));
}

var utube = function() {

	function _message(text, messageClass) {
		alert(text); // TODO
	}

	function _transition() {
		return utube.conf.get("transitions") == "true";
	}

	function _channelbox() {
		return document.querySelector("div.ut_channelbox");
	}

	function _footer() {
		return document.querySelector("div.ut_footer");
	}

return {

	FOOTER_MAX: 60,

	FOOTER_MIN: 8,

	CHANNEL_DATA: "https://gdata.youtube.com/feeds/api/users/{0}",

	CHANNEL_URL: "https://www.youtube.com/user/{0}/featured",

	FEED_DATA: "https://gdata.youtube.com/feeds/api/users/{0}/uploads?orderby=updated{1}{2}",

	VID_EMDED_URL: "https://www.youtube-nocookie.com/embed/{0}",

	VID_THUMBNAIL_URL: "https://i1.ytimg.com/vi/{0}/mqdefault.jpg",

	VID_PAGE_URL: "http://www.youtube.com/watch?v={0}",

	chan: {

		getAll: function() {
			return localStorage.getObject("channels") || [];
		},

		store: function(channels) {
			return localStorage.setObject("channels", channels);
		},

		sortAlphabetical: function(channels) {
			channels.sort(function(a, b){
				return a.name > b.name ? 1 : -1;
			});
		},

		exists: function(channelName) {
			var channels = utube.chan.getAll();
			for (var i = channels.length - 1; i >= 0; i--) {
				if (channels[i].name.toLowerCase().replace(" ", "") ==
					channelName.toLowerCase().replace(" ", "")) {
					return true;
				}
			}
			return false;
		},

		add: function(channelName)
		{
			var isNew = !utube.chan.exists(channelName);
			if (isNew) {
				var channels = utube.chan.getAll();
				data = utube.queryChannel(channelName);
				if (data.error) {
					return "The channel could not be added! (" + data.error + ")";
				}
				channels.push(data);
				utube.chan.sortAlphabetical(channels);
				utube.chan.store(channels);
			} else {
				return channelName + " is already added";
			}
		},

		remove: function(channelName) {
			var channels = utube.chan.getAll();
			for (var i = channels.length - 1; i >= 0; i--) {
				if (channels[i].name == channelName) {
					channels.splice(i, 1);
				}
			};
			channels.remove(channelName);
			utube.chan.store(channels);
		}

	},

	conf: {

		reset: function(source) {
			if (!source) {
				source = utube.conf.standard;
			}
			for (key in source) {
				utube.conf.set(key, source[key], true);
			}
			window.location.reload(false);
		},

		get: function(key) {
			return localStorage.getItem(key);
		},

		set: function(key, value, noapply) {
			localStorage.setItem(key, value);
			if (!noapply) {
				switch (key) {
				case "channels":
					break;
				case "chanorder":
					if (value == "CHANNAME") {
						utube.chan.sortAlphabetical(utube.chan.getAll());
					}
					utube.updateChannels();
					break;
				case "theme":
					utube.reloadTheme();
					break;
				case "transitions":
					utube.updatetransitionConf(value == "true");
					break;
				}
			}
		},

		exportAll: function() {
			return JSON.stringify(localStorage);
		},

		importAll: function(base64) {
			var data = prompt("Copy exported settings below");
			if (data) {
				return true;
			}
			utube.conf.reset(JSON.parse(data));
			return true;
		},

		standard: {
			channels: "[]",
			chanorder: "VIDDATE",
			onvidclick: "EMBED",
			playback: "YT",
			theme: "dusk.css",
			transitions: true
		},

		themes: [
			{
				source: "dusk.css",
				name: "Dusk",
				description: "A dark gradient infested theme"
			},

			{
				source: "mickeysoft.css",
				name: "MickeySoft",
				description: "Dunno"
			}
		]

	},

	showConfigMenu: function() {
		menu = document.createElement("div");
		menu.style.width = "500px";
		menu.innerHTML = document.getElementById("ut_configmenu_content").innerHTML;
		utube.showOverlay(menu);
		var ret = "";
		for (var i = 0; i < utube.conf.themes.length; i++) {
			theme = utube.conf.themes[i];
			cur = utube.conf.get("theme");
			sel = cur === theme.source ? " selected" : "";
			ret += "<option" + sel + " value=\"" + theme.source + "\" title=\"" +
				theme.description + "\">" + theme.name + "</option>";
		}
		menu.getElementsByTagName("select")[0].innerHTML = ret;
		elems = menu.getElementsByTagName("input");
		for (var i = 0; i < elems.length; i++) {
			input = elems[i];
			switch (input.type) {
				case "checkbox":
					if (utube.conf.get(input.name) == "true") {
						input.checked = "checked";
					}
					input.setAttribute("onclick", "utube.conf.set(this.name, this.checked)");
					break;
				case "radio":
					if (utube.conf.get(input.name) == input.value) {
						input.checked = "checked";
					}
					input.setAttribute("onchange", "utube.conf.set(this.name, this.value)");
					break;
				default:
					break;
			}
		}
	},

	showChannelMenu: function() {
		menu = document.createElement("div");
		menu.style.width = "500px";
		menu.innerHTML = document.getElementById("ut_channelmenu_content").innerHTML;
		utube.showOverlay(menu);
		utube.updateChannelMenu();
	},

	updateChannelMenu: function() {
		var list = document.getElementsByClassName("ut_channelmenulist")[1];
		list.removeAll();
		var ch = utube.chan.getAll();
		for (var i = 0; i < ch.length; i++) {
			var icon = ch[i].icon;
			var name = ch[i].name;
			var title = ch[i].title;
			list.innerHTML += '\
				<div class="ut_chanconf_item">\
					<img src="' + icon + '" />\
					<h5>' + title + '</h5>\
					<button onclick="this.parentNode.remove();\
						utube.removeChannelByForm(\'' + name + '\');">Remove</button>\
				</div>\
			';
		}
	},

	updatetransitionConf: function(enable) {
		var style = document.getElementById("disabletransitions");
		if (!enable && !style) {
			style = document.createElement("style");
			style.id = "disabletransitions";
			style.setAttribute("type", "text/css");
			style.innerHTML = "*{transition:none !important;}";
			document.getElementsByTagName("head")[0].appendChild(style);
		} else if (style) {
			style.remove();
		}
	},

	addChannelByForm: function() {
		var inputElem = document.getElementsByClassName("ut_addchannel_txt")[1];
		var oldErrs = document.getElementsByClassName("ut_chanconf_err");
		for (var i = 0; i < oldErrs.length; i++) {
			oldErrs[i].remove();
		}
		var err = utube.chan.add(inputElem.value);
		if (err) {
			var errElem = document.createElement("h6");
			errElem.classList.add("ut_chanconf_err");
			errElem.innerHTML = err;
			inputElem.parentNode.appendChild(errElem);
		} else {
			utube.updateChannelMenu();
			utube.updateChannels();
		}
	},

	removeChannelByForm: function(name) {
		utube.chan.remove(name);
		utube.updateChannels();
	},

	reloadTheme: function() {
		var oldTheme = document.getElementsByClassName("ut_themesource")[0];
		if (oldTheme) {
			oldTheme.remove();
		}
		var link = document.createElement("link");
		link.setAttribute("rel", "stylesheet");
		link.setAttribute("type", "text/css");
		link.setAttribute("href", "css/theme/" + utube.conf.get("theme"));
		link.setAttribute("class", "ut_themesource");
		document.getElementsByTagName("head")[0].appendChild(link);
	},

	queryChannel: function(channelName) {
		var req = new XMLHttpRequest();
		try {
			req.open("GET", utube.CHANNEL_DATA.format(channelName), false);
			req.send();
			xml = req.responseXML;
		} catch (err) {
			return {error: err};
		}
		if (!xml) {
			return {error: "No data received!"};
		}
		var thumbElem = xml.getElementsByTagName("media:thumbnail");
		if (!thumbElem.length) {
			thumbElem = xml.getElementsByTagName("thumbnail");
		}
		return {
			name: channelName,
			icon: thumbElem[0].getAttribute("url"),
			title: xml.getElementsByTagName("title")[0].textContent,
			url: utube.CHANNEL_URL.format(channelName)
		};
	},

	queryVideos: function(channelName, offset, limit) {
		var req = new XMLHttpRequest();
		try {
			req.open("GET", utube.FEED_DATA.format(channelName, "&start-index=" + offset + 1,
				(limit ? "&max-results=" + limit : "")), false);
			req.send();
			xml = req.responseXML;
		} catch (err) {
			return {error: err};
		}
		if (!xml) {
			return {error: "No data received!"};
		}
		var videos = [];
		var rv = xml.getElementsByTagName("entry");
		function parseDate(str) {
			var t = str.split(/-|T|\:|\./i);
			return new Date(t[0], parseInt(t[1]) - 1, t[2], t[3], t[4], t[5]);
		}
		for (var i = 0; i < rv.length; i++) {
			var id = rv[i].getElementsByTagName("id")[0].textContent;
			id = id.substring(id.lastIndexOf("/") + 1, id.length);
			videos.push({
				description: rv[i].getElementsByTagName("content")[0].textContent,
				id: id,
				time: parseDate(rv[i].getElementsByTagName("published")[0].textContent),
				title: rv[i].getElementsByTagName("title")[0].textContent,
			});
		}
		return videos;
	},

	updateVideos: function(chanName, chanElem) {
		chanElem.removeAll();
		var videos = utube.queryVideos(chanName, 0, 0);
		if (videos.error) {
			var err = document.createElement("p");
			err.innerHTML = videos.error;
			chanElem.appendChild(err);
		}
		for (var i = 0; i < videos.length; i++) {
			var id = videos[i].id;
			var thumbnail = utube.VID_THUMBNAIL_URL.format(id);
			var title = videos[i].title;
			var vidElem = document.createElement("div");
			vidElem.classList.add("ut_list_video");
			vidElem.setAttribute("onclick", 'utube.playVideo(\'' + id + '\')');
			vidElem.title = title;
			vidElem.innerHTML = '\
				<h5>' + title + '</h5>\
				<img src="' + thumbnail + '" />\
			';
			chanElem.appendChild(vidElem);
		}
		return videos[0];
	},

	updateChannels: function() {
		document.getElementsByClassName("ut_channelbox")[0].removeAll();
		var channels = utube.chan.getAll();
		var chanBox = document.getElementsByClassName("ut_channelbox")[0];
		var width = 0;
		var margin = 0;
		var channelsOut = [];
		for (var i = 0; i < channels.length; i++) {
			var icon = channels[i].icon;
			var name = channels[i].name;
			var title = channels[i].title;
			var url = channels[i].url;
			var chanElem = document.createElement("div");
			var vidElem = document.createElement("div");
			vidElem.classList.add("ut_channel_videos");
			chanElem.classList.add("ut_channel");
			chanElem.innerHTML = '\
				<a href="' + url + '" target="_blank" title="' + title + '">\
					<div class="ut_channel_head">\
						<img src="' + icon + '" />\
						<h3>' + title + '</h3>\
					</div>\
				</a>\
			';
			chanElem.appendChild(vidElem);
			channelsOut.push({
				v: utube.updateVideos(name, vidElem),
				e: chanElem
			});
		}
		if (utube.conf.get("chanorder") == "VIDDATE") {
			channelsOut.sort(function(a, b){
				return a.v.time.getTime() < b.v.time.getTime() ? 1 : -1;
			});
		}
		for (var i = 0; i < channelsOut.length; i++) {
			var chanElem = channelsOut[i].e;
			chanBox.appendChild(chanElem);
			if (i == 0) {
				margin = chanElem.offsetLeft;
			}
			width += chanElem.clientWidth + margin;
		}
		chanBox.style.width = width + margin + "px";
	},

	playVideo: function(id) {
		switch (utube.conf.get("onvidclick")) {
			case "EMBED":
				var frame = document.createElement("iframe");
				var height = window.innerHeight - 100;
				var width = window.innerWidth - 100;
				var w = height * (16 / 9);
				var h = height;
				if (w > width) {
					w = width;
					h = w / (16 / 9);
				}
				frame.width = w;
				frame.height = h;
				frame.classList.add("ut_embedvideo");
				frame.src = utube.VID_EMDED_URL.format(id);
				frame.setAttribute("allowfullscreen", "allowfullscreen");
				utube.showOverlay(frame);
				break;
			case "EMBEDINTAB":
				window.open(utube.VID_EMDED_URL.format(id));
				break;
			case "OPENYT":
				window.open(utube.VID_PAGE_URL.format(id));
				break;
		}
	},

	showOverlay: function(contentElem) {
		ov = document.createElement("table");
		tr = document.createElement("tr");
		td = document.createElement("td");
		wr = document.createElement("div");
		wr.classList.add("ut_overlay_wrapper");
		contentElem.classList.add("ut_overlay_content")
		contentElem.onclick = function(e){
			e.stopPropagation();
		};
		wr.appendChild(contentElem);
		td.appendChild(wr);
		tr.appendChild(td);
		ov.appendChild(tr);
		ov.classList.add("ut_overlay");
		ov.style.opacity = "0";
		td.onclick = utube.removeOverlay;
		setTimeout(function(){
			ov.style.opacity = "1";
		}, _transition() ? 20 : 0);
		document.getElementsByTagName("body")[0].appendChild(ov);
		wr.style.width = contentElem.clientWidth + "px";
	},

	removeOverlay: function(contentElem) {
		ov = document.getElementsByClassName("ut_overlay");
		if (ov.length > 0) {
			ov = ov[0];
			ov.style.opacity = "0";
			setTimeout(function(){
				ov.remove();
			}, _transition() ? 300 : 0);
		}
	},

	showFooter: function() {
		_channelbox().style.height = "calc(100% - " + (122 + utube.FOOTER_MAX) + "px)";
		_footer().style.height = utube.FOOTER_MAX + "px";
	},

	hideFooter: function() {
		_channelbox().style.height = "calc(100% - " + (122 + utube.FOOTER_MIN) + "px)";
		_footer().style.height = utube.FOOTER_MIN + "px";
	},

	inform: function(text) {
		_message(text, "ut_msg_info");
	},

	error: function(text) {
		_message(text, "ut_msg_err");
	},

	onload: function() {
		if (!localStorage.theme) {
			utube.conf.reset();
		}
		utube.hideFooter();
		utube.reloadTheme();
		utube.updateChannels();
		utube.updatetransitionConf(utube.conf.get("transitions") == "true");

		var cbar = document.getElementsByClassName("ut_cbar")[0];
		var cbox = document.getElementsByClassName("ut_channelbox")[0];
		var left = 0;
		var max = -cbox.clientWidth + window.innerWidth;
		function scrollChannels(e) {
			left += e.wheelDelta || -e.detail * 40;
			if (left > 0) {
				left = 0;
			} else if (left < max) {
				left = max;
			}
			if (cbox.clientWidth > window.innerWidth) {
				cbox.style.left = left + "px";
			} else {
				cbox.style.left = "0px";
			}
		}
		cbar.addEventListener("mousewheel", scrollChannels, false);
		cbar.addEventListener("DOMMouseScroll", scrollChannels, false);
	}

}}();
