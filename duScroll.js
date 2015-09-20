var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var analyser = null;
var FFT_SIZE = 2048;
var useTimeDomain = true;
// var tracks = null;
// var buflen = 1024;
var timeBuf;
var freqBuf;
var rafID;

var lastTimeRan = Date.now();

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
        // console.log("in getUserMedia");
        navigator.getUserMedia = 
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        // console.log("there was error");
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // console.log('in gotStream');
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    if (useTimeDomain) {
        timeBuf = new Float32Array(analyser.frequencyBinCount);
        freqBuf = new Uint8Array( analyser.frequencyBinCount );    
    }
    else {
        freqBuf = new Uint8Array( analyser.frequencyBinCount );    
    }
    mediaStreamSource.connect( analyser );
    updatePitch();
    // setInterval(updatePitch, 10);
    setInterval(duScroll, 10);
}

function updatePitch() {
    var now = Date.now();
    // console.log("time since last update pitch: " + (now - lastTimeRan));
    lastTimeRan = now;
    if (useTimeDomain) {
        var a = Date.now();
        updateWithTimeDomain();
        var b = Date.now();
        // console.log(b + ' update with time domain took: ' + (b-a));
    }
    else {
        updateWithFreqDomain();
    }
    filterOldFreqs();
    // console.log("size of state: " + state.length);
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = window.webkitRequestAnimationFrame;
    rafID = window.requestAnimationFrame( updatePitch );
}

function updateWithFreqDomain() {
    analyser.getByteFrequencyData(freqBuf);
    // console.log(buf);
    var currFreq = getFrequencyFromBuf(freqBuf);
    currTime = Date.now();
    // console.log(state);

    if (currFreq != -1) {
        state.push([currFreq, currTime]);
    }
}

function updateWithTimeDomain() {
    analyser.getByteFrequencyData(freqBuf);
    var currFreq = getFrequencyFromBuf(freqBuf);

    // this is just noise
    if (currFreq == -1) {
        return; 
    }

    analyser.getFloatTimeDomainData( timeBuf );
    var ac = autoCorrelate( timeBuf, audioContext.sampleRate );
    console.log(ac);
    currTime = Date.now();
    if (ac != -1 && ac < 500) {
        state.push([ac, currTime]);
        // console.log(state); 
    }
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

function getFrequencyFromBuf(freqBuf) {
    var MIN_LOUDNESS_ALLOWED = 230;
    var max = freqBuf[0];
    var maxIndex = 0;

    for (var i = 0; i < freqBuf.length; i++) {
        if (freqBuf[i] > max) {
            maxIndex = i;
            max = freqBuf[i];
        }
    }


    if (freqBuf[maxIndex] > MIN_LOUDNESS_ALLOWED) {
        $(".noise-floor").css("color", "green");
        return maxIndex;
    } else {
        $(".noise-floor").css("color", "red");
        return -1;
    }
}

function duScroll() {
    // get a moving average of dfs of everything in state
    if (state.length <= 1) {
        return;
    }

    if (useTimeDomain) {
        duScrollWithTime();
    }
    else {
        duScrollWithFreq();
    }
}

function duScrollWithTime() {
    var freqs = state.map(function(x) { return x[0]; });
    var minFreq = Math.min.apply(Math,freqs);
    var filtered = state.filter(function(x) { return x[0] <= 1.5 * minFreq; });
    var dfs = new Array(state.length - 1);
    for (i = 0; i < state.length - 1; i ++ ){
        dfs[i] = state[i+1][0] - state[i][0];
    }
    var averageDf = average(dfs);
    // console.log(averageDf);
    // if ( Math.abs(averageDf) > 200 ) {
    //     console.log(state);
    // }
    scrollBy(0, -100 * averageDf);
}

function duScrollWithFreq() {
    var dfs = new Array(state.length - 1);
    for (i = 0; i < state.length - 1; i ++ ){
        dfs[i] = state[i+1][0] - state[i][0];
    }

    var averageDf = average(dfs);
    // console.log(averageDf);
    scrollBy(0, -100 * averageDf);

    // var freqs = state.map(function(x){ return x[0]; });
    // var stdev = standardDeviation(freqs);
    // var avg = average(freqs);
    // if (state.length >= 2) {
    //     console.log('here');
    //     var mostRecent = state[state.length - 1][0];
    //     var secondMostRecent = state[state.length - 2][0];
    //     // if ((Math.abs(mostRecent - avg) <= stdev) && (Math.abs(secondMostRecent - avg) <= stdev)) {
    //     // scrollBy(0,-50 * (mostRecent - secondMostRecent));
    //     if (mostRecent - secondMostRecent > 0) {   
    //         scrollBy(0,-50); 
    //     }
    //     else if (mostRecent . secondMostRecent < 0) {
    //         scrollBy(0, 50);
    //     }
    // }
    // var filtered = filtervalues(state);
}


function autoCorrelate( buf, sampleRate ) {
    var SIZE = buf.length;
    var MAX_SAMPLES = Math.floor(SIZE/2);
    var best_offset = -1;
    var best_correlation = 0;
    var rms = 0;
    var foundGoodCorrelation = false;
    var correlations = new Array(MAX_SAMPLES);

    for (var i=0;i<SIZE;i++) {
        var val = buf[i];
        rms += val*val;
    }
    rms = Math.sqrt(rms/SIZE);
    if (rms<0.01) // not enough signal
        return -1;

    var lastCorrelation=1;
    for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
        var correlation = 0;

        for (var i=0; i<MAX_SAMPLES; i++) {
            correlation += Math.abs((buf[i])-(buf[i+offset]));
        }
        correlation = 1 - (correlation/MAX_SAMPLES);
        correlations[offset] = correlation; // store it, for the tweaking we need to do below.
        if ((correlation>0.9) && (correlation > lastCorrelation)) {
            foundGoodCorrelation = true;
            if (correlation > best_correlation) {
                best_correlation = correlation;
                best_offset = offset;
            }
        } else if (foundGoodCorrelation) {
            // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
            // Now we need to tweak the offset - by interpolating between the values to the left and right of the
            // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
            // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
            // (anti-aliased) offset.

            // we know best_offset >=1, 
            // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
            // we can't drop into this clause until the following pass (else if).
            var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
            return sampleRate/(best_offset+(8*shift));
        }
        lastCorrelation = correlation;
    }
    if (best_correlation > 0.01) {
        // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
        return sampleRate/best_offset;
    }
    return -1;
//  var best_frequency = sampleRate/best_offset;
}


function filterValues(values) {
    var stdev = standardDeviation(values);
    var avg = average(values);
    return values.filter(function(x) { return Math.abs(x[0] - avg) <= stdev; });
}



function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;

}
