var analyser = null;
var tracks = null;
var buflen = 1024;
var buf = new Uint8Array( buflen );
var state = [];

window.onload = function() {
    fillPage();
    audioContext = new AudioContext();
    MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));    // corresponds to a 5kHz signal
    getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream);
    console.log('here');
}

function fillPage() {
    for (i = 0; i < 1000; i++) {
        var x = $("<p>").append("" + i);
        $("body").append(x)    
    }
    
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        console.log("in getUserMedia");
        navigator.getUserMedia = 
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        console.log("there was error");
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    console.log('in gotStream');
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    setInterval(updatePitch, 10);
    // updatePitch();
}

function updatePitch() {
    analyser.getByteFrequencyData( buf );
    // console.log(buf);
    var f = getFrequencyFromBuf();
    console.log(f);
    window.scrollTo(0, f*100);
    state.push(f);
}


function getFrequencyFromBuf() {
    var max = buf[0];
    var maxIndex = 0;

    for (var i = 1; i < buf.length; i++) {
        if (buf[i] > max) {
            maxIndex = i;
            max = buf[i];
        }
    }
    return maxIndex;
}
