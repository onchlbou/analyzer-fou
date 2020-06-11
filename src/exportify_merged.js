import React from "react";
import ReactDOM from "react-dom";
import $ from "jquery";
import "./styles.css";

class App extends React.Component {
  
  state = {
    playlists :  [
      { p_title : "moutmout", p_date : "20/04/94" },
      { p_title : "uchebe", p_date : "16/08/94" }
    ],
    tracks : [
      {t_title: "Arizona dream", t_artist : "Bufalo" },
      {t_title: "colorado sleep", t_artist : "horse" }
    ],
    access_token : "",
    PlaylistTable_visible: 0
  };

  componentDidMount(){
    var vars = window.location.hash.substring(1).split('&');
    var key = {};
    for (var i=0; i<vars.length; i++) {
      var tmp = vars[i].split('=');
      key[tmp[0]] = tmp[1];
    }

    if (this.getQueryParam('rate_limit_message') !== '') {
      // Show rate limit message
      $('#rateLimitMessage').show();
    } else if (typeof key['access_token'] === 'undefined') {
      $('#loginButton').css('display', 'inline-block')
    } else {

      this.setState({
        access_token : key["access_token"], 
        expires_in : key["expires_in"], 
        token_type : key["token_type"],
        PlaylistTable_visible : 1
      });
    }
  };

  display = e => {
  /*console.log(this.getQueryParam("app_client_id"));
    console.log(window.location);
    console.log(this.state.playlists[1]); */
    var vars = window.location.hash.substring(1).split('&');
    var key = {};
    for (var i=0; i<vars.length; i++) {
      var tmp = vars[i].split('=');
      key[tmp[0]] = tmp[1];
    }

    this.setState({
      access_token : key["access_token"], 
      expires_in : key["expires_in"], 
      token_type : key["token_type"] 
    });

    console.log(this.state.access_token);
    console.log(this.state.token_type);
    console.log(this.state.expires_in);
    //console.log(key["access_token"]);
    //console.log(key["expires_in"]);
    //console.log(key["token_type"]);
  };

  authorize = () => {
    var client_id = this.getQueryParam('app_client_id');

    if (client_id === '') {
      client_id = "d275773774d1430caead656c79eaccd0"
    }

    window.location = "https://accounts.spotify.com/authorize" +
      "?client_id=" + client_id +
      "&redirect_uri=" + encodeURIComponent([window.location.protocol, '//', window.location.host, window.location.pathname].join('')) +
      "&scope=playlist-read-private%20playlist-read-collaborative" +
      "&response_type=token";
  };


  // http://stackoverflow.com/a/901144/4167042
  getQueryParam = name => {
    // eslint-disable-next-line 
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(window.location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  };

  apiCall = (url, access_token) => {
    console.log(url);
    console.log(access_token);
    return $.ajax({
      url: url,
      headers: {
        Authorization: "Bearer " + access_token
      }
    }).fail(function(jqXHR, textStatus) {
      if (jqXHR.status === 401) {
        // Return to home page after auth token expiry
        window.location = window.location.href.split("#")[0];
      } else if (jqXHR.status === 429) {
        // API Rate-limiting encountered
        window.location =
          window.location.href.split("#")[0] + "?rate_limit_message=true";
      } else {
        // Otherwise report the error so user can raise an issue
        alert(jqXHR.responseText);
      }
    });
  };


  render(){
    return(
      <div>
        <button id="loginButton" type="submit" className="btn btn-default btn-lg" onClick={this.authorize}>
          <i className="fa fa-check-circle-o"></i> Get Started
        </button>

        <button onClick={this.authorize}>Connect to API</button>
        <button onClick={this.display}>Debug</button>
        <button onClick={this.LoadPlaylists}>LoadPlaylists</button>

        {this.state.PlaylistTable_visible === 1 ?  <PlaylistTable access_token={this.state.access_token} onApiCall={this.apiCall}/> : ""}

      </div>
    )
  };
}

class PlaylistTable extends React.Component {
  state = {
    playlists: [],
    playlistCount: 0,
    nextURL: null,
    prevURL: null
  };
  
  

  loadPlaylists = (url) => {
    var userId = '';
    var firstPage = typeof url === 'undefined' || url.indexOf('offset=0') > -1;

    
    this.props.onApiCall("https://api.spotify.com/v1/me", this.props.access_token).then(function(response) {
      userId = response.id;

      // Show starred playlist if viewing first page
      if (firstPage) {
        return $.when.apply($, [
          this.props.onApiCall(
            "https://api.spotify.com/v1/users/" + userId + "/starred",
            this.props.access_token
          ),
          this.props.onApiCall(
            "https://api.spotify.com/v1/users/" + userId + "/playlists",
            this.props.access_token
          )
        ])
      } else {
        return window.Helpers.apiCall(url, this.props.access_token);
      }
    }.bind(this)).done(function() {
      var response;
      var playlists = [];

      if (arguments[1] === 'success') {
        response = arguments[0];
        playlists = arguments[0].items;
      } else {
        response = arguments[1][0];
        playlists = $.merge([arguments[0][0]], arguments[1][0].items);
      }

      if (this.isMounted()) {
          this.setState({
          playlists: playlists,
          playlistCount: response.total,
          nextURL: response.next,
          prevURL: response.previous
        });

        $('#playlists').fadeIn();
        $('#subtitle').text((response.offset + 1) + '-' + (response.offset + response.items.length) + ' of ' + response.total + ' playlists for ' + userId)
      }
    }.bind(this))
  };

  exportPlaylists = () => {
    PlaylistsExporter.export(this.props.access_token, this.state.playlistCount);
  };

  componentDidMount = () => {
    this.loadPlaylists(this.props.url);
  };

  render() {

    if (this.state.playlists.length > 0) {
      return (
        <div id="playlists">
          <Paginator nextURL={this.state.nextURL} prevURL={this.state.prevURL} loadPlaylists={this.loadPlaylists}/>
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{width: "30px"}}></th>
                <th>Name</th>
                <th style={{width: "150px"}}>Owner</th>
                <th style={{width: "100px"}}>Tracks</th>
                <th style={{width: "120px"}}>Public?</th>
                <th style={{width: "120px"}}>Collaborative?</th>
                <th style={{width: "100px"}} className="text-right"><button className="btn btn-default btn-xs" type="submit" onClick={this.exportPlaylists}><span className="fa fa-file-archive-o"></span> Export All</button></th>
              </tr>
            </thead>
            <tbody>
              {this.state.playlists.map(function(playlist, i) {
                return <PlaylistRow playlist={playlist} key={playlist.id} access_token={this.props.access_token}/>;
              }.bind(this))}
            </tbody>
          </table>
          <Paginator nextURL={this.state.nextURL} prevURL={this.state.prevURL} loadPlaylists={this.loadPlaylists}/>
        </div>
        );
      } else {
        return <div className="spinner"></div>
      }

      {/* <div class="container">
        <h1>Welcome ish</h1>
        <h2>
          <button onClick={this.authorize}>Connect to API</button>
          <button onClick={this.display}>Debug</button>
          <button onClick={this.LoadPlaylists}>LoadPlaylists</button>
        </h2>
      </div> */}
  };
} // end of class

class PlaylistRow extends React.Component {
  exportPlaylist = () => {
    //PlaylistExporter.export(this.props.access_token, this.props.playlist);
  };

  renderTickCross = (condition) => {
    if (condition) {
      return <i className="fa fa-lg fa-check-circle-o"></i>
    } else {
      return <i className="fa fa-lg fa-times-circle-o" style={{ color: '#ECEBE8' }}></i>
    }
  };

  renderIcon = (playlist) => {
    if (playlist.name === 'Starred') {
      return <i className="glyphicon glyphicon-star" style={{ color: 'gold' }}></i>;
    } else {
      return <i className="fa fa-music"></i>;
    }
  };

  render() {
    var playlist = this.props.playlist
    if(playlist.uri==null) return (
      <tr key={this.props.key}>
        <td>{this.renderIcon(playlist)}</td>
        <td>{playlist.name}</td>
        <td colSpan="2">This playlist is not supported</td>
        <td>{this.renderTickCross(playlist.public)}</td>
        <td>{this.renderTickCross(playlist.collaborative)}</td>
        <td>&nbsp;</td>
      </tr>
    );
    return (
      <tr key={this.props.key}>
        <td>{this.renderIcon(playlist)}</td>
        <td><a href={playlist.uri}>{playlist.name}</a></td>
        <td><a href={playlist.owner.uri}>{playlist.owner.id}</a></td>
        <td>{playlist.tracks.total}</td>
        <td>{this.renderTickCross(playlist.public)}</td>
        <td>{this.renderTickCross(playlist.collaborative)}</td>
        <td className="text-right"><button className="btn btn-default btn-xs btn-success" type="submit" onClick={this.exportPlaylist}><span className="glyphicon glyphicon-save"></span> Export</button></td>
      </tr>
    );
  }
}

class Paginator extends React.Component {
  nextClick = (e)=> {
    e.preventDefault()

    if (this.props.nextURL != null) {
      this.props.loadPlaylists(this.props.nextURL)
    }
  };

  prevClick = (e) => {
    e.preventDefault()

    if (this.props.prevURL != null) {
      this.props.loadPlaylists(this.props.prevURL)
    }
  };

  render() {
    if (this.props.nextURL != null || this.props.prevURL != null) {
      return (
        <nav className="paginator text-right">
          <ul className="pagination pagination-sm">
            <li className={this.props.prevURL == null ? 'disabled' : ''}>
              <a href="#" aria-label="Previous" onClick={this.prevClick}>
                <span aria-hidden="true">&laquo;</span>
              </a>
            </li>
            <li className={this.props.nextURL == null ? 'disabled' : ''}>
              <a href="#" aria-label="Next" onClick={this.nextClick}>
                <span aria-hidden="true">&raquo;</span>
              </a>
            </li>
          </ul>
        </nav>
      )
    } else {
      return <div>&nbsp;</div>
    }
  }
}
// Handles exporting all playlist data as a zip file
var PlaylistsExporter = {
  export: function(access_token, playlistCount) {
    var playlistFileNames = [];

    window.Helpers.apiCall("https://api.spotify.com/v1/me", access_token).then(function(response) {
      var limit = 20;
      var userId = response.id;

      // Initialize requests with starred playlist
      var requests = [
        window.Helpers.apiCall(
          "https://api.spotify.com/v1/users/" + userId + "/starred",
          access_token
        )
      ];

      // Add other playlists
      for (var offset = 0; offset < playlistCount; offset = offset + limit) {
        var url = "https://api.spotify.com/v1/users/" + userId + "/playlists";
        requests.push(
          window.Helpers.apiCall(url + '?offset=' + offset + '&limit=' + limit, access_token)
        )
      }

      $.when.apply($, requests).then(function() {
        var playlists = [];
        var playlistExports = [];

        // Handle either single or multiple responses
        if (typeof arguments[0].href == 'undefined') {
          $(arguments).each(function(i, response) {
            if (typeof response[0].items === 'undefined') {
              // Single playlist
              playlists.push(response[0]);
            } else {
              // Page of playlists
              $.merge(playlists, response[0].items);
            }
          })
        } else {
          playlists = arguments[0].items
        }

        $(playlists).each(function(i, playlist) {
          playlistFileNames.push(PlaylistExporter.fileName(playlist));
          playlistExports.push(PlaylistExporter.csvData(access_token, playlist));
        });

        return $.when.apply($, playlistExports);
      }).then(function() {
        //var zip = new JSZip();
        //var responses = [];

        $(arguments).each(function(i, response) {
          //zip.file(playlistFileNames[i], response)
        });

        //var content = zip.generate({ type: "blob" });
        //saveAs(content, "spotify_playlists.zip");
      });
    });
  }
}

// Handles exporting a single playlist as a CSV file
var PlaylistExporter = {
  export: function(access_token, playlist) {
    /* this.csvData(access_token, playlist).then(function(data) {
      var blob = new Blob(["\uFEFF" + data], { type: "text/csv;charset=utf-8" });
      saveAs(blob, this.fileName(playlist));
    }.bind(this)) */
  },

  csvData: function(access_token, playlist) {
    var requests = [];
    var limit = 100;

    for (var offset = 0; offset < playlist.tracks.total; offset = offset + limit) {
      requests.push(
        window.Helpers.apiCall(playlist.tracks.href.split('?')[0] + '?offset=' + offset + '&limit=' + limit, access_token)
      )
    }

    return $.when.apply($, requests).then(function() {
      var responses = [];

      // Handle either single or multiple responses
      if (typeof arguments[0] != 'undefined') {
        if (typeof arguments[0].href == 'undefined') {
          responses = Array.prototype.slice.call(arguments).map(function(a) { return a[0] });
        } else {
          responses = [arguments[0]];
        }
      }

      var tracks = responses.map(function(response) {
        return response.items.map(function(item) {
          return [
            item.track.uri,
            item.track.name,
            item.track.artists.map(function(artist) { return artist.name }).join(', '),
            item.track.album.name,
            item.track.disc_number,
            item.track.track_number,
            item.track.duration_ms,
            item.added_by == null ? '' : item.added_by.uri,
            item.added_at
          ].map(function(track) { return '"' + track + '"'; })
        });
      });

      // Flatten the array of pages
      tracks = $.map(tracks, function(n) { return n })

      tracks.unshift([
        "Spotify URI",
        "Track Name",
        "Artist Name",
        "Album Name",
        "Disc Number",
        "Track Number",
        "Track Duration (ms)",
        "Added By",
        "Added At"
      ]);

      var csvContent = '';
      tracks.forEach(function(infoArray, index){
        var dataString = infoArray.join(",");
        csvContent += index < tracks.length ? dataString+ "\n" : dataString;
      });

      return csvContent;
    });
  },

  fileName: function(playlist) {
    return playlist.name.replace(/[^a-z0-9\- ]/gi, '').replace(/[ ]/gi, '_').toLowerCase() + ".csv";
  }
}


/* $(function() {
});  */

const rootElement = document.getElementById("root");
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  rootElement
);

