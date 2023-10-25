import React from "react";
import ReactDOM from "react-dom";
import $ from "jquery";
import "./styles.css";

import RadarChart from 'react-svg-radar-chart';
import 'react-svg-radar-chart/build/css/index.css'

import { Image, Button, Radio, Table, Icon, Segment, Grid, Divider, Feed, Progress, Statistic, Container } from "semantic-ui-react";



class App extends React.Component {
  state = {
    access_token: "",
    playlistTable_visible: false,
    trackTable_visible: false,
    currentlyPlayedTable_visible: 0,
    playlist_id: "",
    playlist_name: "",
    youtube_visible: true,
    spotify_visible: true
  };

  componentDidMount() {
    var vars = window.location.hash.substring(1).split('&');
    var key = {};
    for (var i = 0; i < vars.length; i++) {
      var tmp = vars[i].split('=');
      key[tmp[0]] = tmp[1];
    }
    this.setState({
      isAccess_token: vars,
      access_token: key["access_token"],
      expires_in: key["expires_in"],
      token_type: key["token_type"],
    });
  };

  fetchYoutubeApi = () => {
    var api_key = process.env.REACT_APP_YOUTUBE_API_KEY
    var video_id = "tIRj5P2ABew"
    var max_results = 2
    const apiCallLikes = 'https://www.googleapis.com/youtube/v3/videos/getRating?part=snippet&key=' + api_key + '&videoId=' + video_id + '&maxResults=' + max_results
    fetch(apiCallLikes)
      .then(result => result.json())
      .then(data => {
        console.log(data);
      })
  }

  handleSelectedPlaylist = (playlist_id, playlist_name) => {
    this.setState({
      playlist_id: playlist_id,
      playlist_name: playlist_name,
      playlistTable_visible: false,
      trackTable_visible: true
    });
  }

  loadPlaylists = () => {
    if (this.state.access_token !== undefined) {
      this.setState({
        playlistTable_visible: !this.state.playlistTable_visible,
        trackTable_visible: false
      })
    }
  };

  loadcurrentlyPlayedSong = () => {
    if (this.state.access_token !== undefined) {
      this.setState({ currentlyPlayedTable_visible: 1 });
    }
  };

  authorize = () => {
    var client_id = this.getQueryParam('app_client_id');

    if (client_id === '') {
      client_id = process.env.REACT_APP_SPOTIFY_CLIENT_ID
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

  render() {
    const loadButton = this.state.playlistTable_visible ? "Unload Playlists" : "Load Playlists"
    return (
      <div>
        <Table selectable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{ width: "30px" }}><div><Icon color="black" name='spotify' size='large' /> </div></Table.HeaderCell>
              <Table.HeaderCell style={{ width: "30px" }}><Button onClick={this.authorize}>Connect to API</Button> </Table.HeaderCell>
              <Table.HeaderCell style={{ width: "30px" }}><Button onClick={this.loadPlaylists}>{loadButton}</Button></Table.HeaderCell>
              <Table.HeaderCell style={{ width: "30px" }}><Radio toggle defaultChecked={true} label="Show Youtube" onChange={() => this.setState({ youtube_visible: !this.state.youtube_visible })} />   </Table.HeaderCell>
              <Table.HeaderCell style={{ width: "30px" }}><Radio toggle defaultChecked={true} label="Show Spotify" onChange={() => this.setState({ spotify_visible: !this.state.spotify_visible })} />   </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
        </Table>
        <Container>
          <center>
            {
              this.state.playlistTable_visible
                ? <PlaylistTable
                  token={this.state.access_token}
                  onSelectedPlaylistChange={this.handleSelectedPlaylist} />
                : <div>{/* Playlists non chargées */} </div>
            }
            {
              this.state.trackTable_visible
                ? <TrackTable
                  token={this.state.access_token}
                  playlist_id={this.state.playlist_id}
                  playlist_name={this.state.playlist_name}
                  youtube_visible={this.state.youtube_visible}
                  spotify_visible={this.state.spotify_visible} />
                : <div>{/* Tracktable non chargée */} </div>
            }
            {/* {this.state.currentlyPlayedTable_visible === 1 ? <CurrentlyPlayingTable token={this.state.access_token} /> : <div>Rien en écoute pour le moment </div>} */}
          </center>
        </Container>
      </div>
    )
  };
}

var apiCall = (url, access_token) => {
  return $.ajax({
    url: url,
    headers: {
      Authorization: "Bearer " + access_token
    }
  }).fail(function (jqXHR, textStatus) {
    if (jqXHR.status === 401) {
      window.location = window.location.href.split("#")[0];
    } else if (jqXHR.status === 429) {
      window.location =
        window.location.href.split("#")[0] + "?rate_limit_message=true";
    } else {
      alert(jqXHR.responseText);
    }
  });
};

class PlaylistTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      playlists: [],
      playlistCount: 0,
      nextURL: null,
      prevURL: null,
      playlist_id: "",
      playlist_name: "test"
    };
  }

  onSelectedPlaylistStatus = (playlistid, playlistName) => {
    this.setState({
      playlist_id: playlistid,
      playlist_name: playlistName
    });
  };

  getPlaylists = token => {
    var userId = '';
    var url
    var firstPage = typeof url === 'undefined' || url.indexOf('offset=0') > -1;
    url = "https://api.spotify.com/v1/me";
    apiCall(url, token).then(function (response) {
      userId = response.id;
      if (firstPage) {
        return $.when.apply($, [
          apiCall("https://api.spotify.com/v1/users/" + userId + "/playlists", token)
        ])
      } else {
        return apiCall(url, token);
      }
    }).done(function () {
      var response;
      var playlists = [];
      if (arguments[1] === 'success') {
        response = arguments[0];
        playlists = arguments[0].items;
      } else {
        response = arguments[1][0];
        playlists = $.merge([arguments[0][0]], arguments[1][0].items);
      }
      if (this._isMounted) {
        this.setState({
          playlists: playlists,
          playlistCount: response.total,
          nextURL: response.next,
          prevURL: response.previous,
          playlistTable_updated: 1
        });
        $('#playlists').fadeIn();
        $('#subtitle').text((response.offset + 1) + '-' + (response.offset + response.items.length) + ' of ' + response.total + ' playlists for ' + userId)
      }
    }.bind(this)) //bind is mandatory to apply setState in a querry function
  }

  componentDidMount() {
    this._isMounted = true;
    this.getPlaylists(this.props.token);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.playlist_id !== this.state.playlist_id) {
      this.props.onSelectedPlaylistChange(
        this.state.playlist_id,
        this.state.playlist_name
      )
    }
  }

  render() {
    if (this.state.playlists.length > 0) {
      return (
        <div id="playlists">
          <Table selectable>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell style={{ width: "30px" }}></Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell style={{ width: "150px" }}>Owner</Table.HeaderCell>
                <Table.HeaderCell style={{ width: "100px" }}>Tracks</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {
                this.state.playlists.map(function (playlist) {
                  return <PlaylistRow
                    key={playlist.id}
                    playlist={playlist}
                    token={this.props.token}
                    onSelectedPlaylist={this.onSelectedPlaylistStatus}
                  />;
                }.bind(this))
              }
            </Table.Body>
          </Table>
        </div>
      );
    } else {
      return <div className="spinner"></div>
    }
  };//end of render
}

class PlaylistRow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      key: null
    };
  }

  handleClick = e => {
    this.props.onSelectedPlaylist(
      this.props.playlist.uri.replace("spotify:playlist:", ""),
      this.props.playlist.name
    );
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentDiUnmount() {
    this._isMounted = false;
  }

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
    if (playlist.uri == null || typeof (playlist.images[0]) == "undefined") return (
      <Table.Row className="playlist-title" onClick={this.handleClick} key={playlist.id}>
        <Table.Cell>{this.renderIcon(playlist)}</Table.Cell>
        <Table.Cell>{playlist.name}</Table.Cell>
        <Table.Cell colSpan="2">not supported</Table.Cell>
        <Table.Cell>&nbsp;</Table.Cell>
      </Table.Row>
    );
    return (
      <Table.Row className="playlist-title" onClick={this.handleClick} key={playlist.id}>
        <Table.Cell><img src={playlist.images[0].url} alt="Playlist cover" style={{ width: "60px" }} /></Table.Cell>
        <Table.Cell><a href={playlist.uri}>{playlist.name}</a></Table.Cell>
        <Table.Cell><a href={playlist.owner.uri}>{playlist.owner.id}</a></Table.Cell>
        <Table.Cell>{playlist.tracks.total}</Table.Cell>
        <Table.Cell className="text-right"><Button onClick={this.handleClick}>Export</Button></Table.Cell>
      </Table.Row>
    );
  }
}

class TrackTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tracks: [],
      tracksCount: 0,
      playlist_id: "",
      playlist_name: ""
    };
  }

  analyzePlaylist = (p_id) => {
    apiCall("https://api.spotify.com/v1/playlists/" + p_id + "/tracks", this.props.token).then(function (response) {
      var tracks = [];
      tracks = response.items;
      if (this._isMounted) {
        this.setState({
          tracks: tracks,
          tracksCount: response.total
        });
      }
    }.bind(this))
  };

  componentDidMount() {
    this._isMounted = true;
    this.analyzePlaylist(this.props.playlist_id);
  }

  componentDiUnmount() {
    this._isMounted = false;
  }

  render() {
    if (this.state.tracks.length > 0) {
      return (
        <div id="tracklist">
          <h3>{this.props.playlist_name}</h3>
          <Table className="ui sortable celled table" selectable>
            <Table.Header>
              <Table.Row >
                <Table.HeaderCell>Cover</Table.HeaderCell>
                <Table.HeaderCell /* className="sorted descending" */>Title</Table.HeaderCell>
                <Table.HeaderCell>Artist</Table.HeaderCell>
                <Table.HeaderCell>Release Date</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            {this.state.tracks.map(function (track, i) {
              return <TrackRow
                track={track.track}
                key={track.track.id}
                token={this.props.token}
                onSelectedPlaylist={this.onSelectedPlaylistStatus}
                preview_mp3={track.track.preview_url}
                youtube_visible={this.props.youtube_visible}
                spotify_visible={this.props.spotify_visible}
              />;
            }.bind(this))}
          </Table>
          <script src="./tablesort.js"></script>
        </div>
      );
    } else {
      return <div className="spinner"></div>
    }
  }
}

class TrackRow extends React.Component {
  constructor() {
    super();
    this.state = {
      data: [
        { null: "" }
      ],
      expandedRows: []
    };
  }

  handleRowClick(rowId) {
    const currentExpandedRows = this.state.expandedRows;
    const isRowCurrentlyExpanded = currentExpandedRows.includes(rowId);
    const newExpandedRows = isRowCurrentlyExpanded
      ? currentExpandedRows.filter(id => id !== rowId)
      : currentExpandedRows.concat(rowId);
    this.setState({ expandedRows: newExpandedRows });
  }

  renderItemCaret(rowId) {
    const currentExpandedRows = this.state.expandedRows;
    const isRowCurrentlyExpanded = currentExpandedRows.includes(rowId);
    if (isRowCurrentlyExpanded) {
      return <Icon name="caret down" />;
    } else {
      return <Icon name="caret left" />;
    }
  }

  renderItemDetails(item) {
    var track = this.props.track
    return (
      <div>
        <Segment basic>
          <center>
            {
              this.props.spotify_visible
                ? <Grid doubling columns={3}>
                  <Grid.Column >
                    <h5>Biography</h5>
                    <LastFmBiography lastfm_query={track.artists[0].name} />
                  </Grid.Column>
                  <Grid.Column /* style={{width: "20%"}}  */>
                    <h5>Artist popularity</h5>
                    <TagsAndPopularity uri={track.artists[0].uri} token={this.props.token} />
                  </Grid.Column>
                  <Grid.Column>
                    <h5>Audio Features</h5>
                    <AudioAnalysis uri={track.uri} token={this.props.token} />
                  </Grid.Column>
                </Grid>
                : ""
            }
            {
              this.props.youtube_visible && this.props.spotify_visible
                ? <Divider />
                : ""
            }
            {
              this.props.youtube_visible
                ? <Grid columns={1}>
                  <Grid.Column>
                    <h5>Youtube Analysis</h5>
                    <YoutubeAnalysis youtube_query={track.name + " - " + track.artists[0].name} />
                  </Grid.Column>
                </Grid>
                : ""
            }
          </center>
        </Segment>
      </div>
    );
  }

  renderItem(item, index) {
    let audio = new Audio(this.props.track.preview_url)
    const clickCallback = () => this.handleRowClick(index);
    var track = this.props.track
    const itemRows = [
      <tr className="track-title" onClick={clickCallback} key={"row-data-" + index}>
        <Table.Cell>
          {
            <img
              onMouseOver={() => audio.play()}
              onMouseLeave={() => audio.pause()}
              src={track.album.images[0].url}
              alt="track cover"
              style={{ width: "30px" }}
            />
          }
        </Table.Cell>
        <Table.Cell><a href={track.uri}>{track.name}</a></Table.Cell>
        <Table.Cell><a href={track.artists[0].uri}>{track.artists[0].name}</a></Table.Cell>
        <Table.Cell>{track.album.release_date}</Table.Cell>
      </tr>
    ];

    if (this.state.expandedRows.includes(index)) {
      itemRows.push(
        <tr className="track-details" key={"row-expanded-" + index}>
          <td colSpan="5">{this.renderItemDetails(item)}</td>
        </tr>
      );
    }
    return itemRows;
  }

  render() {
    let allItemRows = [];
    this.state.data.forEach((item, index) => {
      const perItemRows = this.renderItem(item, index);
      allItemRows = allItemRows.concat(perItemRows);
    });
    return (
      <Table.Body >
        {allItemRows}
      </Table.Body>
    );
  }
}//End TrackRow

class LastFmBiography extends React.Component {
  constructor(props) {
    super(props);
    this.lastfm_key = process.env.REACT_APP_LASTFM_API_KEY
    this.state = {}
  }

  getBiography = () => {
    const apiBiography = 'https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=' + this.props.lastfm_query + '&api_key='+this.lastfm_key+'&format=json'
    fetch(apiBiography)
      .then(result => result.json())
      .then(data => {
        if (data.artist.bio.content) {
          let selectedText = "<a href";
          let originalPhrase = data.artist.bio.content;
          originalPhrase = originalPhrase.slice(0, originalPhrase.indexOf(selectedText))
          this.setState({
            biography: originalPhrase
          })
        }
      })
  }

  componentDidMount() {
    this.getBiography();
  }

  render() {
    return (
      <div className="scrollable" tabIndex="0">
        <div className="scrollable-content">
          {this.state.biography}
        </div>
      </div>
    )
  }
}

class AudioAnalysis extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      track_id: "",
      danceability: 0.735,
      energy: 0.578,
      key: 5,
      loudness: -11.84,
      mode: 0,
      speechiness: 0.0461,
      acousticness: 0.514,
      instrumentalness: 0.0902,
      liveness: 0.159,
      valence: 0.624,
      tempo: 98.002,
      type: "audio_features",
      id: "06AKEBrKUckW0KREUWRnvT",
      duration_ms: 255349,
    }
  }

  getAudioFeatures = (t_id) => {
    apiCall("https://api.spotify.com/v1/audio-features/" + t_id.replace("spotify:track:", ""), this.props.token).then(function (response) {
      if (this._isMounted) {
        this.setState({
          track_id: response.id,
          danceability: response.danceability,
          energy: response.energy,
          key: response.key,
          loudness: response.loudness,
          mode: response.mode,
          speechiness: response.speechiness,
          acousticness: response.acousticness,
          instrumentalness: response.instrumentalness,
          liveness: response.liveness,
          valence: response.valence,
          tempo: response.tempo,
          id: "06AKEBrKUckW0KREUWRnvT",
          tracksCount: response.total,
          RadartChart_width: null
        });
      }
    }.bind(this)).done(function () {})
  }

  componentDidMount() {
    this._isMounted = true;
    this.getAudioFeatures(this.props.uri);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const af = this.state; //af = audio features
    return (
      <div>
        key : {af.key} <br></br>
        <RadarChart
          captions={{
            acousticness: 'acousticness',
            danceability: 'danceability',
            energy: 'energy',
            instrumentalness: 'instrumentalness',
            liveness: 'liveness',
            loudness: 'loudness',
            speechiness: 'speechiness',
            tempo: 'tempo',
            valence: 'valence'
          }}
          data={[
            {
              data: {
                acousticness: af.acousticness,
                danceability: af.danceability,
                energy: af.energy,
                instrumentalness: af.instrumentalness,
                liveness: af.liveness,
                loudness: af.loudness / -20,
                speechiness: af.speechiness,
                tempo: af.tempo / 200,
                valence: af.valence
              },
              meta: { color: '#58FCEC' }
            },
          ]}
          size={200}
        />
      </div>
    )
  }
}

const youtube_api_keys = [
  "",    // project_name="portfolio"
  "",    // project_name="AF-01"
  "",    // project_name="AF-02"
  ""     // project_name="AF-03"
];

class YoutubeAnalysis extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      number_of_tokens_used: null, 
      number_of_requests: null, 
      token: process.env.REACT_APP_YOUTUBE_API_KEY,
      videoId: "",
      viewCount: null,
      dislikeCount: null,
      commentCount: null,
      comments: [
        { authorChannelUrl: "", authorProfileImageUrl: "", textDisplay: "", likeCount: "" }
      ],
      status_ok: "true"
    }
  }

  //type 1 : search = 100pts
  //type 2 : ratings = 1pts
  //type 3 : comments = 3pts
  get_youtube_api_key = (type_of_youtube_search) => {
    var nb_tokens = this.state.number_of_tokens_used
    var nb_req = this.state.number_of_requests
    var given_api = ""
    if (type_of_youtube_search === 1) {
      nb_tokens = nb_tokens + 100
    }
    else if (type_of_youtube_search === 2) {
      nb_tokens = nb_tokens + 1
    }
    else if (type_of_youtube_search === 3) {
      nb_tokens = nb_tokens + 3
    } else {
      alert("undefined type of Youtube data v3 search..")
    }
    nb_req = nb_req + 1
    this.setState({ number_of_tokens_used: nb_tokens, number_of_requests: nb_req })
    given_api = youtube_api_keys[nb_req % youtube_api_keys.length]
    console.log("nb_tokens:", nb_tokens, " type:", type_of_youtube_search, "api given:", given_api, "length:", youtube_api_keys.length)
    return given_api
  }

  apiYoutubeSearch = (searchTerm) => {
    const apiSearch = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=' + searchTerm + '&key=' + this.state.token
    fetch(apiSearch)
      .then(result => result.json())
      .then(data => {
        this.setState({
          videoId: data.items[0].id.videoId,
          status_ok: true
        }, this.apiYoutubeComments(data.items[0].id.videoId)) //callback 
      }).catch(error => {
        this.setState({
          status_ok: false
        })
        console.error(error)
      })
  }

  apiYoutubeComments = (videoId) => {
    var max_results = 10 // Comments and likes
    const apiCallComments = 'https://www.googleapis.com/youtube/v3/commentThreads?order=relevance&part=snippet&key=' + this.state.token + '&videoId=' + videoId + '&maxResults=' + max_results
    fetch(apiCallComments)
      .then(result => result.json())
      .then(data => {
        this.setState({
          comments: data.items.map(el => (
            {
              authorDisplayName: el.snippet.topLevelComment.snippet.authorDisplayName,
              authorChannelUrl: el.snippet.topLevelComment.snippet.authorChannelUrl,
              authorProfileImageUrl: el.snippet.topLevelComment.snippet.authorProfileImageUrl,
              textOriginal: el.snippet.topLevelComment.snippet.textOriginal,
              likeCount: el.snippet.topLevelComment.snippet.likeCount
            }
          ))
        }, this.apiYoutubeStatistics()); //callback
      })
      .catch((err) => {
        console.log(err);
      });
  }

  apiYoutubeStatistics = () => {
    const apiCallStats = 'https://www.googleapis.com/youtube/v3/videos?part=statistics&key=' + this.state.token + '&id=' + this.state.videoId
    fetch(apiCallStats)
      .then(result => result.json())
      .then(data => {
        this.setState({
          viewCount: data.items[0].statistics.viewCount,
          likeCount: data.items[0].statistics.likeCount,
          dislikeCount: data.items[0].statistics.dislikeCount,
          commentCount: data.items[0].statistics.commentCount,
          percentReaction: Number(((Number(data.items[0].statistics.commentCount) / Number(data.items[0].statistics.viewCount)) * 100).toFixed(2)),
          percentAppreciation: Number(((1 - ((Number(data.items[0].statistics.dislikeCount)) / (Number(data.items[0].statistics.dislikeCount) + Number(data.items[0].statistics.likeCount)))) * 100).toFixed(2))
        })
      })
  }

  componentDidMount() {
    this._isMounted = true;
    this.apiYoutubeSearch(this.props.youtube_query);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const comments = this.state.comments
    return (
      <div>
        <Segment basic>
          <center>
            <Grid doubling columns={2}>
              <Grid.Column>
                <h5>Comments</h5>
                <div className="scrollable" tabIndex="0">
                  <div className="scrollable-content">
                    {comments.map(comment => <YoutubeComments key={comment.authorChannelUrl} user={comment} status={this.state.status_ok} />)}
                  </div>
                </div>
              </Grid.Column>
              <Grid.Column>
                <h5>Statistics</h5>
                <YoutubeStats video={this.state} />
              </Grid.Column>
            </Grid>
          </center>
        </Segment>
      </div>
    )
  }
}

const YoutubeStats = (props) => (
  <div>
    <div>
      <div align="left">
        <Progress label="Reaction" percent={props.video.percentReaction} />
      </div>
    </div>
    <Statistic.Group size="mini">
      <Statistic>
        <Statistic.Value>{props.video.viewCount}</Statistic.Value>
        <Statistic.Label>Views</Statistic.Label>
      </Statistic>
      <Statistic size="mini">
        <Statistic.Value>{props.video.commentCount}</Statistic.Value>
        <Statistic.Label>Comments Number</Statistic.Label>
      </Statistic>
    </Statistic.Group>
    <br></br>
    <br></br>
    <div>
      <div align="left">
        <Progress label="Appreciation" percent={props.video.percentAppreciation} />
      </div>
    </div>
    <center>
      <Statistic.Group size="mini">
        <Statistic>
          <Statistic.Value>{props.video.likeCount}</Statistic.Value>
          <Statistic.Label>Likes</Statistic.Label>
        </Statistic>
        <Statistic>
          <Statistic.Value>{props.video.dislikeCount}</Statistic.Value>
          <Statistic.Label>Dislikes</Statistic.Label>
        </Statistic>
      </Statistic.Group>
    </center>
  </div>
);

const YoutubeComments = (props) => (
  props.status
    ? <Feed>
      <Feed.Event>
        <div align="left">
          <Image avatar verticalAlign="middle" src={props.user.authorProfileImageUrl} />
        </div>
        <Feed.Content>
          <Feed.Summary>
            <a href={props.user.authorChannelUrl}>{props.user.authorDisplayName}</a>
            <Feed.Date></Feed.Date> {/* //need to find the date somewhere */}
          </Feed.Summary>
          <Feed.Extra text>
            {props.user.textOriginal}
          </Feed.Extra>
          <Feed.Meta>
            <Feed.Like>
              <Icon name='like' />{props.user.likeCount} Likes
            </Feed.Like>
          </Feed.Meta>
        </Feed.Content>
      </Feed.Event>
    </Feed>
    : <p>Youtube comments    <br></br>
      can't be displayed, <br></br>
      Number of tokens reached...<br></br>
      <span role="img" aria-label="sheep">🐑🐑🐑🐑🐑<br></br>🐑🐑🐑🐑<br></br>🐑🐑🐑<br></br>🐑🐑<br></br>🐑</span>
    </p>
);

class TagsAndPopularity extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      artist_id: "",
      genres: []
    }
  }

  getTagsAndPopularity = (a_id) => {
    apiCall("https://api.spotify.com/v1/artists/" + a_id.replace("spotify:artist:", ""), this.props.token).then(function (response) {
      if (this._isMounted) {
        this.setState({
          artist_id: response.id,
          followers: response.followers.total,
          popularity: response.popularity,
          genres: response.genres.map(genre => (genre))
        });
      }
    }.bind(this)).done(function () {});
  }

  componentDidMount() {
    this._isMounted = true;
    this.getTagsAndPopularity(this.props.uri);
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const tp = this.state; //tp = tag and popularity
    return (
      <div>
        followers : {tp.followers} <br></br>
        popularity : {tp.popularity} <br></br>
        <br></br>
        {tp.genres.map(function (value, index, array) {
          return <div className="ui tiny label" key={index}>{value}</div>
        })
        }
      </div>
    )
  }
}
// eslint-disable-next-lin
class CurrentlyPlayingTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: null,
      token: null,
      item: {
        album: {
          images: [{ url: "" }]
        },
        name: "",
        artists: [{ name: "" }],
        duration_ms: 0
      },
      is_playing: "Paused",
      progress_ms: 0,
      count: 0
    };
  }

  getCurrentlyPlaying = token => {
    $.ajax({
      url: "https://api.spotify.com/v1/me/player",
      type: "GET",
      beforeSend: xhr => {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      },
      success: data => {
        this.setState({
          item: data.item,
          is_playing: data.is_playing,
          progress_ms: data.progress_ms,
          isLoaded: true
        });
      }
    });
  };

  componentDidMount() {
    this.getCurrentlyPlaying(this.props.token);
  }

  render() {
    const { error, isLoaded, item } = this.state;
    if (error) {
      console.log("error");
      return <div>Erreur : {error.message}</div>;
    } else if (!isLoaded) {
      return <div>Chargement…</div>;
    } else {
      const urls = item.album.images.map((i) => <li> {i.height} : {i.url} </li>)
      return (
        <div>
          {urls}
        </div>
      );
    }

  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  rootElement
);

