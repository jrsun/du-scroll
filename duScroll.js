var analyser = null;
var FFT_SIZE = 2048;
// var tracks = null;
// var buflen = 1024;
var buf;

var state = [];

window.onload = function() {
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

    // setInterval(filterOldFreqs, 1000);
    // setInterval(duScroll, 10);
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
    analyser.fftSize = FFT_SIZE;
    buf = new Uint8Array( analyser.frequencyBinCount );
    mediaStreamSource.connect( analyser );
    setInterval(updatePitch, 1);
}

function updatePitch() {
    analyser.getByteFrequencyData( buf );
    // console.log(buf);
    var currFreq = getFrequencyFromBuf();
    currTime = Date.now();
    // console.log(state);
    // console.log(currFreq);

    if (currFreq != -1) {
        state.push([currFreq, currTime]);
    }
    filterOldFreqs();
}

function filterOldFreqs() {
    var historyMilisecondTolerance = 200;
    var currTime = Date.now();
    var i = state.length - 1;
    while (i >= 0) {
        var timestamp = state[i][1];
        if (Math.abs(timestamp - currTime) > historyMilisecondTolerance) {
            state = state.slice(i + 1, state.length);
            return;
        }
        i--;
    }
}

function getFrequencyFromBuf() {
    var MIN_LOUDNESS_ALLOWED = 210;
    var max = buf[0];
    var maxIndex = 0;

    for (var i = 0; i < buf.length; i++) {
        if (buf[i] > max) {
            maxIndex = i;
            max = buf[i];
        }
    }

    if (buf[maxIndex] > 200) {
        $(".noise-floor").css("color", "green");
        return maxIndex;
    } else {
        $(".noise-floor").css("color", "red");
        return -1;
    }
}
