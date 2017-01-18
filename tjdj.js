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


var searchterm = "johnny yemi" ;
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
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body)
      if(result.tracks.items.length > 0) {
        downloadFile(result.tracks.items[0].preview_url) ; // download preview file
      }
      result.tracks.items.forEach(function(track){

        var trackartists = ""
        track.artists.forEach(function(artist){
          trackartists = trackartists + artist.name + ", "
        })
        console.log(track.name, " by " ,trackartists, track.popularity)
      })
    }else{
      console.log(error + " error" + response.statusCode)
    }
  })
}


function downloadFile(url){
  var dest = "preview.mp3"
  var file = fs.createWriteStream(dest);
  var donwloadrequest = request.get(url);

  // verify response code
  donwloadrequest.on('response', function(response) {
    if (response.statusCode !== 200) {
      return cb('Response status was ' + response.statusCode);
    }
  });

  // check for request errors
  donwloadrequest.on('error', function (err) {
    fs.unlink(dest);
  });
  donwloadrequest.pipe(file);
  file.on('finish', function() {
    file.close();
    //playSound();
    converttoWav("") ;
  });

  file.on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
  });
}

/**
* [converttoWav converts file from Mp3 to wave. Needs to have mpg321 installed]
* @return {[type]} [description]
*/

const spawn = require('child_process').spawn;
function converttoWav(inputfile){

  const ls = spawn('mpg321', ['-w','preview.wav', 'preview.mp3']);

  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
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
