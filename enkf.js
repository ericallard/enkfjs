/* global numeric */

function enkf(ensemble, observation, obsFunction, obsError) {
    'use strict';
    // very inefficient for large numbers of observations
    // need a better numeric library for a better implementation
    var nm = enkf.numeric;
    var e = ensemble;
    var N = enkf.nens(e);
    var m = enkf.nvar(observation);

    var HX = obsFunction(e); //synthetic data
    var P = nm.add(enkf.cov(HX),nm.diag(obsError)); // HQH^T + R
    var D = [], i, j;
    for (i = 0; i < N; i++) {
        D.push([]);
        for (j = 0; j < m; j++) {
            D[i].push(enkf.normRand(observation[0][j], obsError[0][j]));
        }
    } // perturbed data
    D = nm.sub(D,HX); // innovation
    
    var AHA = enkf.cov(e,HX);
    var K = nm.mul(AHA,nm.inv(P)); // kalman gain
    return nm.add(e,nm.mul(K,D));

}

(function () {
    'use strict';

    enkf.numeric = numeric;
    if (numeric === undefined) { enkf.numeric = require('numeric'); }
    var nm = enkf.numeric;
    
    function ones(n, m) {
        var i, j, o = [];
        for (i = 0; i < n; i++) {
            o.push([]);
            for (j = 0; j < m; j++) {
                o[i].push(1.0);
            }
        }
        return o;
    }

    var cached = NaN;
    enkf.normRand = function (mu, sigma) {
        sigma = sigma || 1.0;
        mu = mu || 0.0;
        var z = cached;
        var a, b;
        cached = NaN;
        if (!z) {
            a = Math.random() * 2 * Math.PI;
            b = Math.sqrt(-2.0 * Math.log(1.0 - Math.random()));
            z = Math.cos(a) * b;
            cached = Math.sin(a) * b;
        }
        return mu + z * sigma;
    };

    enkf.randn = function (n, m, mu, sigma) {
        var i, j, o = [];
        for (i = 0; i < n; i++) {
            o.push([]);
            for(j = 0; j < m; m++) {
                o[i].push(enkf.normRand(mu, sigma));
            }
        }
        return o;
    };
    
    function nens(e) {
        return nm.dim(e)[0];
    }
    enkf.nens = nens;
    
    function nvar(e) {
        return nm.dim(e)[1];
    }
    enkf.nvar = nvar;


    enkf.mean = function (ensemble) {
        var e = ensemble;
        var N = nens(e);
        var o = ones(1,N);
        return nm.mul(nm.dot(o, e), 1.0/N);
    };

    enkf.submean = function (ensemble) {
        var e = ensemble;
        var N = nens(e);
        return nm.sub(e, nm.dot(ones(N,1),enkf.mean(e)));
    };

    enkf.cov = function (ensemble, synData) {
        var e = ensemble;
        var s = synData || ensemble;
        var N = nens(e);
        var A1 = enkf.submean(e), A2;
        if (e === s) {
            A2 = A1;
        } else {
            A2 = enkf.submean(s);
        }
        return nm.mul(nm.dot(A1,nm.transpose(A2)),1.0/(N-1));
    };

    enkf.obsFunction = function (iv) {
        if (iv === undefined) { return function (e) { return nm.rep(e); }; }
        if (!Array.isArray(iv)) { iv = [iv]; }
        return function (e) {
            var i, j, h = [];
            for (i = 0; i < e.length; i++) {
                h.push([]);
                for (j = 0; j < iv.length; j++) {
                    h[i].push(e[i][iv[j]]);
                }
            }
            return h;
        };
    };

})();



if (typeof module !== 'undefined' && module.hasOwnProperty('exports')) { module.exports.enkf = enkf; }
