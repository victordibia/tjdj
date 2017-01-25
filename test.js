var config = require('./config'); // gets our username and passwords from the config.js files
//var watson = require('watson-developer-cloud');
var stt = require('watson-developer-cloud/speech-to-text/v1'); // set up watson speech to text
var tts = require('watson-developer-cloud/text-to-speech/v1'); // set up watson text to speech
var Sound = require('node-aplay');
var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');
var request = require("request");

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
************************************************************************
In this step, the audio sample (pipe) is sent to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/


var fs = require('fs');
var exec = require('child_process').exec;

var text_to_speech = new tts({
    username: config.TTSUsername,
    password: config.TTSPassword,
    version: 'v1'
});


/************************************************************************
* Step #2: Configuring the Microphone
************************************************************************
In this step, we configure your microphone to collect the audio samples as you talk.
See https://www.npmjs.com/package/mic for more information on
microphone input events e.g on error, startcomplete, pause, stopcomplete etc.
*/

var mic = require('mic');
var micInstance = mic({
    'rate': '44100',
    'channels': '2',
    'debug': false,
    'exitOnSilence': 6
});
var micInputStream;


/************************************************************************
* Step #3: Converting your Speech Commands to Text
************************************************************************
In this step, the audio sample is sent (piped) to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/


pipeStream();

function pipeStream() {
    micInputStream = micInstance.getAudioStream();

    micInputStream.on('data', function(data) {
        //console.log("Recieved Input Stream: " + data.length);
    });

    micInputStream.on('error', function(err) {
        console.log("Error in Input Stream: " + err);
    });

    micInputStream.on('silence', function() {
        // detect silence.
    });
    micInstance.start();
    console.log("TJ is listening, you may speak now.");

    var speech_to_text = new stt({
        username: config.STTUsername,
        password: config.STTPassword,
        version: config.version
    });

    var recognizeparams = {
        content_type: 'audio/l16; rate=44100; channels=2',
        interim_results: true,
        smart_formatting: true
        //  model: 'en-US_BroadbandModel'  // Specify your language model here
    };

    textStream = micInputStream.pipe(speech_to_text.createRecognizeStream(recognizeparams));
    textStream.setEncoding('utf8');
}

textStream.on('data', function(str) {
    console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
    //parseText(str);
});

textStream.on('error', function(err) {
    console.log(' === Watson Speech to Text : An Error has occurred ===== \n'); // handle errors
    console.log(err);
    var reconnectinterval = 3000;
    console.log(err + "Attempting to reconnect .. in " + reconnectinterval / 1000 + " seconds");
    micInstance.stop();
    setTimeout(function() {

        pipeStream();
    }, reconnectinterval);

});
