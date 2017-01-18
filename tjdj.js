// var pigpio = require('pigpio')
// pigpio.initialize();
var config = require('./config');  // gets our username and passwords from the config.js files
var watson = require('watson-developer-cloud');
var Sound = require('node-aplay');

var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var fs = require('fs');
var exec = require('child_process').exec;
var text_to_speech = watson.text_to_speech({
  username: config.TTSUsername,
  password: config.TTSPassword,
  version: 'v1'
});

var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');


var request = require("request") ;


var searchterm = "please dont judge me" ;
var searchtype = "track"
var options = {
  method: 'GET',
  url : "https://api.spotify.com/v1/search",
  qs : {
    q:searchterm.replace(/ /g,"+"),
    type : searchtype,
    market :"US",
    limit : 20
  }
}

getSpotify();

function getSpotify(){


  var maxpopularity = 0 ;
  var selectedtrack ;
  console.log("searching spotify for " + searchterm + " ....");
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body)
      if(result.tracks.items.length > 0) {
        //downloadFile(result.tracks.items[0].preview_url) ; // download preview file
        result.tracks.items.forEach(function(track){
          var trackartists = ""
          selectedtrack = track.popularity > maxpopularity ? track : selectedtrack ;
          maxpopularity = track.popularity > maxpopularity ? track.popularity : maxpopularity ;
          track.artists.forEach(function(artist){
            trackartists = trackartists + artist.name + ", "
          })
          console.log(track.name, " by " ,trackartists, track.popularity)
        })

        console.log("selected = " + selectedtrack.name)
        downloadFile(selectedtrack.preview_url)
      }

    }else{
      console.log(error + " error" + response.statusCode)
    }
  })
}


function downloadFile(url){
  var destinationfile = "preview.mp3"
  var file = fs.createWriteStream(destinationfile);
  var donwloadrequest = request.get(url);

  // verify response code
  donwloadrequest.on('response', function(response) {
    if (response.statusCode !== 200) {
      return cb('Response status was ' + response.statusCode);
    }
  });

  // check for request errors
  donwloadrequest.on('error', function (err) {
    fs.unlink(destinationfile);
  });
  donwloadrequest.pipe(file);
  file.on('finish', function() {
    file.close();
    converttoWav(destinationfile) ;
  });

  file.on('error', function(err) { // Handle errors
    fs.unlink(destinationfile); // Delete the file async. (But we don't check the result)
  });
}

/**
* [converttoWav converts file from Mp3 to wave. Needs to have mpg321 installed]
* @return {[type]} [description]
*/

const spawn = require('child_process').spawn;
function converttoWav(soundfile){
  var destination = "preview.wav"
  console.log("Converting " + soundfile + " to " + destination)
  const ls = spawn('mpg321', ['-w',destination, soundfile, '-g', '50']);

  ls.stdout.on('data', (data) => {
    //console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    //console.log(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log("conversation successful ...")
    playSound("preview.wav")
  });
}

var isplaying = false ;
function playSound(soundfile){
  isplaying = true ;
  music = new Sound(soundfile);
  music.play();
  music.on('complete', function () {
    console.log('Done with music playback!');
    isplaying = false;
  });
}
