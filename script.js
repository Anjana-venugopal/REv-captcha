// Web Audio Synthesizer
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playBeep(freq = 440, type = 'sine', duration = 0.08) {
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch(e) {}
        }

        // --- GLOBAL TELEMETRY ENGINE ---
        let mousePositions = [];
        let tileHoverTimes = {};
        let currentHoverTile = null;
        let hoverStartTime = 0;
        let humanScore = 0;
        let totalAngleVariance = 0;
        let microJerkCount = 0;

        // 10-Second Hard Timer Variables
        const TIMEOUT_LIMIT = 10.0;
        let timeRemaining = TIMEOUT_LIMIT;
        let timerInterval = null;
        let globalStartTime = 0;
        let verificationStarted = false;

        // Track cursor trajectory, angular acceleration, and tremor noise
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            mousePositions.push({ x: e.clientX, y: e.clientY, time: now });
            if (mousePositions.length > 30) mousePositions.shift();

            analyzeTrajectory();
        });

        function analyzeTrajectory() {
            if (mousePositions.length < 5) return;

            let angleChange = 0;
            let jerkSum = 0;

            for (let i = 2; i < mousePositions.length; i++) {
                let p1 = mousePositions[i-2];
                let p2 = mousePositions[i-1];
                let p3 = mousePositions[i];

                let a1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                let a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                let diff = Math.abs(a2 - a1);
                angleChange += diff;

                // Jerk / Micro-tremors (rapid high-frequency hand vibrations)
                let dt = (p3.time - p1.time) || 1;
                let dist = Math.hypot(p3.x - p1.x, p3.y - p1.y);
                let speed = dist / dt;
                if (speed > 0.05 && diff > 0.4) {
                    jerkSum += diff;
                }
            }

            totalAngleVariance = angleChange;
            if (jerkSum > 1.2) microJerkCount++;

            // Update HUD elements
            if (angleChange > 1.2) {
                humanScore = Math.min(100, humanScore + 1.5);
                document.getElementById('hudCurve').innerText = 'BIOLOGICAL CURVE';
                document.getElementById('hudCurve').style.color = '#ff3344';
            } else {
                document.getElementById('hudCurve').innerText = 'DIRECT VECTOR';
                document.getElementById('hudCurve').style.color = '#00ff66';
            }

            document.getElementById('hudTremor').innerText = (jerkSum).toFixed(2);
            document.getElementById('hudProb').innerText = humanScore.toFixed(1) + '%';
            if (humanScore > 40) {
                document.getElementById('hudProb').style.color = '#ff3344';
            }
        }

        function startGlobalTimer() {
            if (timerInterval) return;
            globalStartTime = Date.now();
            
            timerInterval = setInterval(() => {
                const elapsed = (Date.now() - globalStartTime) / 1000;
                timeRemaining = Math.max(0, TIMEOUT_LIMIT - elapsed);

                // Update displays
                const displayStr = timeRemaining.toFixed(1) + 's';
                document.getElementById('hudTimer').innerText = timeRemaining.toFixed(2) + 's';
                document.getElementById('timerDisplay').innerText = displayStr;

                const percent = (timeRemaining / TIMEOUT_LIMIT) * 100;
                const timerBar = document.getElementById('timerBar');
                if (timerBar) {
                    timerBar.style.width = percent + '%';
                    if (percent < 30) timerBar.style.backgroundColor = '#ff3344';
                    else if (percent < 60) timerBar.style.backgroundColor = '#ffbe3b';
                }

                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    denyAccess("10-SECOND TIMEOUT EXCEEDED", "Human reaction latency detected. Automated agents process security challenges in < 100 milliseconds.");
                }
            }, 50);
        }

        // Generator for AI-Only Noise Canvases
        // Render 9 canvases with high-frequency steganographic micro-noise.
        // Valid tiles encode a specific parity bit array in pixel data that a computer program reads in 1ms.
        let tileParityMap = [];

        function generateNoiseCanvases() {
            tileParityMap = [];
            for (let i = 0; i < 9; i++) {
                const canvas = document.getElementById(`c${i}`);
                if (!canvas) continue;
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                const imgData = ctx.createImageData(64, 64);

                // Determine if this tile satisfies the CRC parity rule (Randomly assign 3 valid bot tiles)
                const isValidBotTile = (i === 1 || i === 4 || i === 8);
                tileParityMap[i] = isValidBotTile;

                for (let p = 0; p < imgData.data.length; p += 4) {
                    // Seed noise pixels
                    let noise = Math.floor(Math.random() * 255);
                    imgData.data[p] = noise;       // R
                    imgData.data[p+1] = noise;     // G
                    imgData.data[p+2] = noise;     // B
                    imgData.data[p+3] = 255;       // Alpha
                }

                // Encode steganographic checksum marker in top-left pixels (0,0) and (1,1)
                if (isValidBotTile) {
                    imgData.data[0] = 0;   // Marker R
                    imgData.data[1] = 255; // Marker G
                    imgData.data[2] = 102; // Marker B
                }

                ctx.putImageData(imgData, 0, 0);

                // Add optical grid overlays
                ctx.strokeStyle = isValidBotTile ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for(let x=0; x<64; x+=8) { ctx.moveTo(x, 0); ctx.lineTo(x, 64); }
                ctx.stroke();
            }
        }

        function startVerification() {
            if (verificationStarted) return;
            verificationStarted = true;

            playBeep(600, 'sine', 0.08);
            startGlobalTimer();

            const checkbox = document.getElementById('captchaCheckbox');
            const spinner = document.getElementById('captchaSpinner');

            checkbox.style.display = 'none';
            spinner.style.display = 'block';

            setTimeout(() => {
                spinner.style.display = 'none';
                checkbox.style.display = 'block';

                // Evaluate instantaneous automated trigger vs human latency
                const triggerTime = (Date.now() - globalStartTime);

                // If trajectory shows biological curves, tremors, or reaction time > 150ms -> Popup AI Grid
                if (triggerTime > 120 || humanScore > 15 || microJerkCount > 2) {
                    playBeep(300, 'square', 0.12);
                    generateNoiseCanvases();
                    document.getElementById('challengeModal').style.display = 'block';
                    document.getElementById('scanLine').style.display = 'block';
                    setupTileHoverTracking();
                } else {
                    // Pure program execution (Instant teleportation, 0 curvature)
                    grantAccess("INSTANT SCRIPT EXECUTION DETECTED. ZERO BIOMETRIC DYNAMICS.");
                }
            }, 400);
        }

        function setupTileHoverTracking() {
            document.querySelectorAll('.grid-tile').forEach(tile => {
                tile.addEventListener('mouseenter', () => {
                    currentHoverTile = tile.getAttribute('data-index');
                    hoverStartTime = Date.now();
                });
                tile.addEventListener('mouseleave', () => {
                    if (currentHoverTile !== null && hoverStartTime > 0) {
                        const hoverDuration = Date.now() - hoverStartTime;
                        tileHoverTimes[currentHoverTile] = (tileHoverTimes[currentHoverTile] || 0) + hoverDuration;
                        document.getElementById('hudHover').innerText = hoverDuration + 'ms';
                        
                        // Humans linger over tiles > 150ms to inspect visually
                        if (hoverDuration > 150) {
                            humanScore = Math.min(100, humanScore + 8);
                        }
                    }
                    currentHoverTile = null;
                });
            });
        }

        function toggleTile(element) {
            playBeep(800, 'sine', 0.04);
            element.classList.toggle('selected');
        }

        function verifySelection() {
            clearInterval(timerInterval);
            const selectedTiles = document.querySelectorAll('.grid-tile.selected');
            const totalElapsed = ((Date.now() - globalStartTime) / 1000).toFixed(2);

            let selectedIndices = [];
            let correctCount = 0;
            let wrongCount = 0;

            selectedTiles.forEach(tile => {
                let idx = parseInt(tile.getAttribute('data-index'));
                selectedIndices.push(idx);
                if (tileParityMap[idx]) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            });

            // Verification Failure Conditions
            if (totalElapsed >= TIMEOUT_LIMIT) {
                denyAccess("10-SECOND LIMIT EXCEEDED", `Processing time: ${totalElapsed}s. Human visual cortex deliberation detected.`);
            } else if (wrongCount > 0 || correctCount !== 3) {
                denyAccess("OPTICAL PARITY FAILURE", `Incorrect steganographic noise buffers selected (${correctCount}/3 valid). Human visual guessing detected.`);
            } else if (humanScore > 35) {
                denyAccess("BIOMETRIC TRAP TRIGGERED", `High human score (${humanScore.toFixed(1)}%). Curved mouse trajectory and hand tremor noise detected.`);
            } else {
                grantAccess(`Steganographic pixel buffers correctly parsed in ${totalElapsed}s with 0.0% biological probability.`);
            }
        }

        function denyAccess(reason, details) {
            playBeep(150, 'sawtooth', 0.35);
            const overlay = document.getElementById('statusOverlay');
            overlay.className = 'status-overlay fail';
            document.getElementById('terminalTitle').innerText = 'SECURITY_ALERT.log';
            document.getElementById('overlayTitle').innerText = '⛔ ' + reason;
            document.getElementById('overlayMessage').innerText = details;

            const elapsed = ((Date.now() - globalStartTime) / 1000).toFixed(2);

            document.getElementById('metricsOutput').innerHTML = `
                &gt; TOTAL TIME ELAPSED: ${elapsed}s / 10.0s<br>
                &gt; TRAJECTORY VARIANCE: ${document.getElementById('hudCurve').innerText}<br>
                &gt; HAND TREMOR / JERK INDEX: ${document.getElementById('hudTremor').innerText}<br>
                &gt; BIOLOGICAL PROBABILITY: ${humanScore.toFixed(1)}%<br>
                &gt; VERDICT: HUMAN ACCESS DENIED.
            `;
            overlay.style.display = 'flex';
        }

        function grantAccess(reason) {
            playBeep(880, 'sine', 0.2);
            const overlay = document.getElementById('statusOverlay');
            overlay.className = 'status-overlay pass';
            document.getElementById('terminalTitle').innerText = 'ACCESS_GRANTED.log';
            document.getElementById('overlayTitle').innerText = '🤖 BOT VERIFIED';
            document.getElementById('overlayMessage').innerText = reason;

            const elapsed = ((Date.now() - globalStartTime) / 1000).toFixed(2);

            document.getElementById('metricsOutput').innerHTML = `
                &gt; VERIFICATION TIME: ${elapsed}s (Sub-10s limit)<br>
                &gt; STEGANOGRAPHY DYNAMICS: NOISE BUFFER MATCH<br>
                &gt; BIOLOGICAL PROBABILITY: 0.0%<br>
                &gt; VERDICT: WELCOME TO THE SERVER AGENT.
            `;
            overlay.style.display = 'flex';
        }

        function resetPortal() {
            location.reload();
        }

        function regenerateCanvases() {
            playBeep(500, 'sine', 0.04);
            generateNoiseCanvases();
        }

        function playBotAudio() {
            for(let i=0; i<6; i++) {
                setTimeout(() => playBeep(1000 + (i*150), 'square', 0.03), i * 40);
            }
        }
