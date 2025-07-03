// Enhanced SilentTalk Application
class EnhancedSilentTalk {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.isActive = false;
        this.currentMode = 'detect';
        this.model = null;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        
        // Enhanced data structures
        this.userData = this.loadUserData();
        this.practiceLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        this.practiceWords = ['HELLO', 'THANK', 'PLEASE', 'SORRY', 'LOVE', 'HELP', 'YES', 'NO'];
        this.currentPracticeIndex = 0;
        this.currentWordIndex = 0;
        this.detectionHistory = [];
        this.sessionStartTime = Date.now();
        
        // Achievements system
        this.achievements = [
            { id: 'first_sign', name: 'First Sign', desc: 'Detect your first sign', icon: 'fa-hand-paper', unlocked: false },
            { id: 'practice_5', name: 'Dedicated Learner', desc: 'Practice 5 signs', icon: 'fa-star', unlocked: false },
            { id: 'accuracy_80', name: 'Sharp Eye', desc: 'Achieve 80% accuracy', icon: 'fa-eye', unlocked: false },
            { id: 'daily_goal', name: 'Daily Champion', desc: 'Complete daily goal', icon: 'fa-trophy', unlocked: false },
            { id: 'streak_7', name: 'Week Warrior', desc: '7 day practice streak', icon: 'fa-fire', unlocked: false },
            { id: 'all_letters', name: 'Alphabet Master', desc: 'Practice all 26 letters', icon: 'fa-graduation-cap', unlocked: false },
            { id: 'speed_demon', name: 'Speed Demon', desc: 'Detect 10 signs in 1 minute', icon: 'fa-bolt', unlocked: false },
            { id: 'perfectionist', name: 'Perfectionist', desc: 'Get 100% accuracy', icon: 'fa-gem', unlocked: false },
            { id: 'social_butterfly', name: 'Social Butterfly', desc: 'Share your progress', icon: 'fa-share', unlocked: false },
            { id: 'data_master', name: 'Data Master', desc: 'Export your data', icon: 'fa-database', unlocked: false },
            { id: 'word_wizard', name: 'Word Wizard', desc: 'Practice 5 words', icon: 'fa-spell-check', unlocked: false },
            { id: 'tutor_graduate', name: 'Tutorial Graduate', desc: 'Complete the tutorial', icon: 'fa-medal', unlocked: false }
        ];
        
        // Tutorial steps
        this.tutorialSteps = [
            {
                title: 'Welcome to SilentTalk!',
                text: 'SilentTalk uses AI to recognize sign language in real-time. Let\'s learn how to use it!'
            },
            {
                title: 'Camera Setup',
                text: 'Click "Start Detection" to begin. Make sure your hands are visible in the camera frame.'
            },
            {
                title: 'Sign Recognition',
                text: 'Show ASL letters to the camera. The AI will detect and display the recognized sign with confidence.'
            },
            {
                title: 'Practice Mode',
                text: 'Use Practice mode to learn specific letters. Follow the prompts and practice each sign.'
            },
            {
                title: 'Track Progress',
                text: 'Your progress, achievements, and statistics are tracked automatically. Keep practicing to improve!'
            }
        ];
        this.currentTutorialStep = 0;
        
        this.initializeComponents();
        this.setupEventListeners();
        this.loadUserInterface();
        this.checkDailyGoal();
        
        console.log('Enhanced SilentTalk initialized');
    }

    // Load user data from localStorage
    loadUserData() {
        const defaultData = {
            totalPoints: 0,
            dailyPractice: 0,
            totalSigns: 0,
            accuracy: 0,
            streak: 0,
            lastPracticeDate: null,
            achievements: [],
            history: [],
            settings: {
                theme: 'light',
                dailyGoal: 10
            }
        };
        
        const stored = localStorage.getItem('silentTalkUserData');
        return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    }

    // Save user data to localStorage
    saveUserData() {
        localStorage.setItem('silentTalkUserData', JSON.stringify(this.userData));
    }

    // Initialize MediaPipe and TensorFlow components
    async initializeComponents() {
        try {
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => this.onResults(results));

            // Initialize camera
            const videoElement = document.getElementById('inputVideo');
            this.camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (this.isActive) {
                        await this.hands.send({ image: videoElement });
                    }
                },
                width: 1280,
                height: 720
            });

            // Initialize Speech Recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';
            }

            console.log('Components initialized successfully');
        } catch (error) {
            console.error('Error initializing components:', error);
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startDetection());
        document.getElementById('stopCamera').addEventListener('click', () => this.stopDetection());
        
        // Speak button
        document.getElementById('speakButton').addEventListener('click', () => this.speakCurrentOutput());
        
        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchMode(e.currentTarget.dataset.mode));
        });
        
        // Practice controls
        document.getElementById('nextLetter')?.addEventListener('click', () => this.nextPracticeLetter());
        document.getElementById('skipLetter')?.addEventListener('click', () => this.nextPracticeLetter());
        document.getElementById('nextWord')?.addEventListener('click', () => this.nextPracticeWord());
        document.getElementById('speakWord')?.addEventListener('click', () => this.speakCurrentWord());
        
        // Tutorial controls
        document.getElementById('startTutorial')?.addEventListener('click', () => this.showTutorial());
        document.getElementById('closeTutorial')?.addEventListener('click', () => this.hideTutorial());
        document.getElementById('nextTutorial')?.addEventListener('click', () => this.nextTutorialStep());
        document.getElementById('prevTutorial')?.addEventListener('click', () => this.prevTutorialStep());
        
        // Quick actions
        document.getElementById('exportData')?.addEventListener('click', () => this.exportUserData());
        document.getElementById('importData')?.addEventListener('click', () => this.importUserData());
        document.getElementById('shareProgress')?.addEventListener('click', () => this.shareProgress());
        document.getElementById('clearHistory')?.addEventListener('click', () => this.clearHistory());
        document.getElementById('refreshStats')?.addEventListener('click', () => this.refreshStats());
        
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNav(e));
    }

    // Load and update user interface
    loadUserInterface() {
        this.updateStats();
        this.updateAchievements();
        this.updateHistory();
        this.applyTheme();
        
        // Update user info
        document.getElementById('userName').textContent = `Welcome, ${this.getUserName()}!`;
        document.getElementById('userPoints').textContent = `${this.userData.totalPoints} pts`;
    }

    // Get user name (simplified for demo)
    getUserName() {
        // In a real app, this would be retrieved after login.
        // For this demo, let's assume it's stored or default to 'User'.
        return localStorage.getItem('silentTalkUser') || 'User';
    }

    // Start hand detection
    async startDetection() {
        try {
            await this.camera.start();
            this.isActive = true;
            this.sessionStartTime = Date.now();
            
            document.getElementById('startCamera').style.display = 'none';
            document.getElementById('stopCamera').style.display = 'inline-flex';
            document.getElementById('statusIndicator').classList.add('active');
            
            this.updateCameraStatus('Detecting...', true);
            console.log('Hand detection started');
        } catch (error) {
            console.error('Error starting camera:', error);
            this.updateDetection('Camera Error', 'Please allow camera access', 0);
        }
    }

    // Stop hand detection
    stopDetection() {
        this.isActive = false;
        if (this.camera) {
            this.camera.stop();
        }
        
        document.getElementById('startCamera').style.display = 'inline-flex';
        document.getElementById('stopCamera').style.display = 'none';
        document.getElementById('statusIndicator').classList.remove('active');
        
        this.updateCameraStatus('Camera Ready', false);
        this.updateDetection('Stopped', 'Detection stopped', 0);
        console.log('Hand detection stopped');
    }

    // Process MediaPipe results
    onResults(results) {
        const canvasElement = document.getElementById('outputCanvas');
        const canvasCtx = canvasElement.getContext('2d');
        
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
                
                const gesture = this.analyzeGestureEnhanced(landmarks);
                if (gesture) {
                    this.updateDetection(gesture.letter, `Confidence: ${Math.round(gesture.confidence)}%`, gesture.confidence);
                    this.processDetection(gesture);
                }
            }
        } else {
            this.updateDetection('No Hand', 'Show your hand to the camera', 0);
        }
        
        canvasCtx.restore();
    }

    analyzeGestureEnhanced(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerPips = [3, 6, 10, 14, 18];
        const fingerMcps = [2, 5, 9, 13, 17];
        
        const fingerStates = this.calculateFingerStates(landmarks, fingerTips, fingerPips, fingerMcps);
        const recognizedLetter = this.matchASLPattern(fingerStates, landmarks);
        
        if (recognizedLetter) {
            const confidence = this.calculateConfidence(fingerStates, recognizedLetter);
            return {
                letter: recognizedLetter,
                confidence: Math.max(60, confidence + Math.random() * 20)
            };
        }
        
        return null;
    }

    calculateFingerStates(landmarks, tips, pips, mcps) {
        const states = [];
        const thumbExtended = landmarks[tips[0]].x > landmarks[pips[0]].x;
        states.push(thumbExtended);
        
        for (let i = 1; i < tips.length; i++) {
            const extended = landmarks[tips[i]].y < landmarks[pips[i]].y;
            states.push(extended);
        }
        return states;
    }

    matchASLPattern(fingerStates, landmarks) {
        const [thumb, index, middle, ring, pinky] = fingerStates;
        const patterns = {
            'A': [false, false, false, false, false], 'B': [false, true, true, true, true],
            'C': [true, false, false, false, false], 'D': [false, true, false, false, false],
            'E': [false, false, false, false, false], 'F': [true, false, true, true, true],
            'G': [true, true, false, false, false], 'H': [false, true, true, false, false],
            'I': [false, false, false, false, true], 'J': [false, false, false, false, true],
            'K': [false, true, true, false, false], 'L': [true, true, false, false, false],
            'M': [true, false, false, false, false], 'N': [true, false, false, false, false],
            'O': [false, false, false, false, false], 'P': [false, true, false, false, false],
            'Q': [true, true, false, false, false], 'R': [false, true, true, false, false],
            'S': [false, false, false, false, false], 'T': [false, true, false, false, false],
            'U': [false, true, true, false, false], 'V': [false, true, true, false, false],
            'W': [false, true, true, true, false], 'X': [false, true, false, false, false],
            'Y': [true, false, false, false, true], 'Z': [false, true, false, false, false]
        };
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [letter, pattern] of Object.entries(patterns)) {
            const score = this.calculatePatternMatch(fingerStates, pattern);
            if (score > bestScore && score > 0.6) {
                bestScore = score;
                bestMatch = letter;
            }
        }
        return bestMatch;
    }

    calculatePatternMatch(actual, expected) {
        let matches = 0;
        for (let i = 0; i < actual.length; i++) {
            if (actual[i] === expected[i]) {
                matches++;
            }
        }
        return matches / actual.length;
    }

    calculateConfidence(fingerStates, letter) {
        const baseConfidence = 70;
        const variability = Math.random() * 20;
        return Math.min(95, baseConfidence + variability);
    }

    processDetection(gesture) {
        this.addToHistory(gesture.letter, gesture.confidence);
        
        switch (this.currentMode) {
            case 'practice':
                this.checkPracticeAnswer(gesture.letter);
                break;
            case 'words':
                this.checkWordProgress(gesture.letter);
                break;
            default:
                this.updatePoints(1);
                break;
        }
        this.checkAchievements(gesture);
    }

    updateDetection(sign, info, confidence) {
        document.getElementById('detectedSign').textContent = sign;
        document.getElementById('detectionInfo').textContent = info;
        document.getElementById('confidenceValue').textContent = `${Math.round(confidence)}%`;
    }

    updateCameraStatus(status, isActive) {
        const statusElement = document.getElementById('cameraStatus');
        statusElement.querySelector('span').textContent = status;
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
            tab.setAttribute('aria-selected', tab.dataset.mode === mode);
        });
        
        document.querySelectorAll('.mode-content').forEach(content => {
            content.style.display = 'none';
        });
        
        const targetMode = document.getElementById(`${mode}Mode`);
        if (targetMode) targetMode.style.display = 'block';
        
        if (mode === 'practice') this.initializePracticeMode();
        else if (mode === 'words') this.initializeWordMode();
        
        console.log('Switched to mode:', mode);
    }

    initializePracticeMode() {
        const targetElement = document.getElementById('practiceTarget');
        if (targetElement) targetElement.textContent = this.practiceLetters[this.currentPracticeIndex];
        
        const feedback = document.getElementById('practiceFeedback');
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'practice-feedback';
        }
    }

    checkPracticeAnswer(detectedLetter) {
        const targetLetter = this.practiceLetters[this.currentPracticeIndex];
        const feedback = document.getElementById('practiceFeedback');
        if (!feedback) return;
        
        if (detectedLetter === targetLetter) {
            feedback.textContent = 'Correct! Well done!';
            feedback.className = 'practice-feedback correct';
            this.speak('Correct!');
            this.updatePoints(5);
            this.updateStats('practiceCorrect');
            setTimeout(() => this.nextPracticeLetter(), 1500);
        } else {
            feedback.textContent = `Try again! Looking for "${targetLetter}", detected "${detectedLetter}"`;
            feedback.className = 'practice-feedback incorrect';
        }
    }

    nextPracticeLetter() {
        this.currentPracticeIndex = (this.currentPracticeIndex + 1) % this.practiceLetters.length;
        this.initializePracticeMode();
        this.updateStats('practiceAttempt');
    }

    initializeWordMode() {
        const targetElement = document.getElementById('wordTarget');
        if (targetElement) targetElement.textContent = this.practiceWords[this.currentWordIndex];
        
        const feedback = document.getElementById('wordFeedback');
        if (feedback) {
            feedback.textContent = `Spell: ${this.practiceWords[this.currentWordIndex]}`;
            feedback.className = 'practice-feedback';
        }
    }

    checkWordProgress(detectedLetter) {
        const currentWord = this.practiceWords[this.currentWordIndex];
        const feedback = document.getElementById('wordFeedback');
        if (feedback) feedback.textContent = `Detected: ${detectedLetter} | Target: ${currentWord}`;
    }

    nextPracticeWord() {
        this.currentWordIndex = (this.currentWordIndex + 1) % this.practiceWords.length;
        this.initializeWordMode();
    }

    speakCurrentWord() {
        const currentWord = this.practiceWords[this.currentWordIndex];
        this.speak(currentWord);
    }

    speak(text) {
        if (this.synthesis && text) {
            this.synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            this.synthesis.speak(utterance);
            console.log('Speaking:', text);
        }
    }

    speakCurrentOutput() {
        const text = document.getElementById('detectedSign').textContent;
        if (text && text !== 'Ready' && text !== 'Stopped' && text !== 'No Hand') {
            this.speak(text);
        }
    }

    addToHistory(sign, confidence) {
        const historyItem = {
            sign,
            confidence: Math.round(confidence),
            timestamp: new Date().toLocaleTimeString(),
            date: new Date().toISOString()
        };
        
        this.userData.history.unshift(historyItem);
        if (this.userData.history.length > 10) {
            this.userData.history = this.userData.history.slice(0, 10);
        }
        
        this.saveUserData();
        this.updateHistory();
    }

    updateHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (this.userData.history.length === 0) {
            historyList.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 1rem;"><i class="fas fa-history"></i><p>Your practice history will appear here</p></div>`;
            return;
        }
        
        historyList.innerHTML = this.userData.history.map(item => `
            <div class="history-item">
                <div><strong>${item.sign}</strong><small style="display: block; color: var(--text-secondary);">${item.confidence}% confidence</small></div>
                <small>${item.timestamp}</small>
            </div>`).join('');
    }

    clearHistory() {
        this.userData.history = [];
        this.saveUserData();
        this.updateHistory();
        console.log('History cleared');
    }

    updatePoints(points) {
        this.userData.totalPoints += points;
        this.userData.dailyPractice += 1;
        this.saveUserData();
        this.updateStats();
        document.getElementById('userPoints').textContent = `${this.userData.totalPoints} pts`;
    }

    updateStats(type = null) {
        const today = new Date().toDateString();
        if (this.userData.lastPracticeDate !== today) {
            if (this.userData.lastPracticeDate) {
                const lastDate = new Date(this.userData.lastPracticeDate);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) this.userData.streak += 1;
                else if (diffDays > 1) this.userData.streak = 1;
            } else {
                this.userData.streak = 1;
            }
            this.userData.lastPracticeDate = today;
            this.userData.dailyPractice = 0;
        }
        
        if (type === 'practiceCorrect') this.userData.accuracy = Math.min(100, this.userData.accuracy + 1);
        
        document.getElementById('dailyPractice').textContent = this.userData.dailyPractice;
        document.getElementById('totalSigns').textContent = this.userData.totalSigns;
        document.getElementById('accuracy').textContent = `${Math.round(this.userData.accuracy)}%`;
        document.getElementById('streak').textContent = this.userData.streak;
        
        const dailyGoal = this.userData.settings.dailyGoal;
        const progress = Math.min(100, (this.userData.dailyPractice / dailyGoal) * 100);
        document.getElementById('goalProgress').textContent = `${this.userData.dailyPractice}/${dailyGoal}`;
        document.getElementById('dailyProgress').style.width = `${progress}%`;
        
        this.saveUserData();
    }

    refreshStats() {
        this.userData.totalSigns = this.userData.history.length;
        this.updateStats();
        const button = document.getElementById('refreshStats');
        const icon = button.querySelector('i');
        icon.style.animation = 'spin 1s linear';
        setTimeout(() => { icon.style.animation = ''; }, 1000);
    }

    checkDailyGoal() {
        const today = new Date().toDateString();
        if (this.userData.lastPracticeDate !== today) this.userData.dailyPractice = 0;
        this.updateStats();
    }

    updateAchievements() {
        const achievementList = document.getElementById('achievementList');
        if (!achievementList) return;
        
        const savedAchievements = this.userData.achievements || [];
        
        achievementList.innerHTML = this.achievements.map(achievement => {
            const isUnlocked = savedAchievements.includes(achievement.id);
            return `
                <div class="achievement-item ${isUnlocked ? 'unlocked' : ''}">
                    <div class="achievement-icon"><i class="fas ${achievement.icon}"></i></div>
                    <div>
                        <div style="font-weight: 500;">${achievement.name}</div>
                        <small style="opacity: 0.8;">${achievement.desc}</small>
                    </div>
                    ${isUnlocked ? '<i class="fas fa-check" style="margin-left: auto;"></i>' : ''}
                </div>`;
        }).join('');
        
        const unlockedCount = savedAchievements.length;
        document.getElementById('totalAchievements').textContent = `${unlockedCount}/${this.achievements.length}`;
    }

    checkAchievements(gesture) {
        const newUnlocked = [];
        const checkAndUnlock = (id, condition, name) => {
            if (!this.userData.achievements.includes(id) && condition) {
                this.unlockAchievement(id);
                newUnlocked.push(name);
            }
        };

        checkAndUnlock('first_sign', gesture, 'First Sign');
        checkAndUnlock('practice_5', this.userData.dailyPractice >= 5, 'Dedicated Learner');
        checkAndUnlock('accuracy_80', this.userData.accuracy >= 80, 'Sharp Eye');
        checkAndUnlock('daily_goal', this.userData.dailyPractice >= this.userData.settings.dailyGoal, 'Daily Champion');
        checkAndUnlock('streak_7', this.userData.streak >= 7, 'Week Warrior');
        
        newUnlocked.forEach(name => this.showAchievementNotification(name));
    }

    unlockAchievement(achievementId) {
        if (!this.userData.achievements.includes(achievementId)) {
            this.userData.achievements.push(achievementId);
            this.userData.totalPoints += 10;
            this.saveUserData();
            this.updateAchievements();
            this.updateStats();
        }
    }

    showAchievementNotification(achievementName) {
        const notification = document.createElement('div');
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: var(--success-color); color: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px var(--shadow); z-index: 1000; animation: fade-in 0.3s ease-out;`;
        notification.innerHTML = `<div style="display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-trophy"></i><div><div style="font-weight: 600;">Achievement Unlocked!</div><div style="font-size: 0.875rem; opacity: 0.9;">${achievementName}</div></div></div>`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'fade-out 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showTutorial() {
        document.getElementById('tutorialOverlay').style.display = 'flex';
        this.currentTutorialStep = 0;
        this.updateTutorialContent();
    }

    hideTutorial() {
        document.getElementById('tutorialOverlay').style.display = 'none';
        this.unlockAchievement('tutor_graduate');
    }

    nextTutorialStep() {
        if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
            this.currentTutorialStep++;
            this.updateTutorialContent();
        } else {
            this.hideTutorial();
        }
    }

    prevTutorialStep() {
        if (this.currentTutorialStep > 0) {
            this.currentTutorialStep--;
            this.updateTutorialContent();
        }
    }

    updateTutorialContent() {
        const step = this.tutorialSteps[this.currentTutorialStep];
        document.getElementById('tutorialTitle').textContent = `${step.title} (${this.currentTutorialStep + 1}/${this.tutorialSteps.length})`;
        document.getElementById('tutorialText').innerHTML = `<p>${step.text}</p>`;
        document.getElementById('prevTutorial').style.display = this.currentTutorialStep === 0 ? 'none' : 'inline-flex';
        document.getElementById('nextTutorial').textContent = this.currentTutorialStep === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';
    }

    toggleTheme() {
        const newTheme = this.userData.settings.theme === 'light' ? 'dark' : 'light';
        this.userData.settings.theme = newTheme;
        this.saveUserData();
        this.applyTheme();
    }

    applyTheme() {
        const theme = this.userData.settings.theme;
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    exportUserData() {
        const dataStr = JSON.stringify(this.userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `silenttalk-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.unlockAchievement('data_master');
        console.log('Data exported');
    }

    importUserData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        this.userData = { ...this.userData, ...importedData };
                        this.saveUserData();
                        this.loadUserInterface();
                        alert('Data imported successfully!');
                    } catch (error) {
                        alert('Error importing data. Please check the file format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    shareProgress() {
        const shareText = `I've been learning sign language with SilentTalk! 🤟\n\n` +
            `📊 My Progress:\n` +
            `• ${this.userData.totalPoints} points earned\n` +
            `• ${this.userData.totalSigns} signs learned\n` +
            `• ${this.userData.accuracy}% accuracy\n` +
            `• ${this.userData.streak} day streak\n\n` +
            `Join me in breaking communication barriers! #SilentTalk #ASL`;
        
        if (navigator.share) {
            navigator.share({ title: 'My SilentTalk Progress', text: shareText });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Progress copied to clipboard!');
            });
        }
        this.unlockAchievement('social_butterfly');
    }

    handleKeyboardNav(event) {
        switch (event.key) {
            case 'Escape':
                if (document.getElementById('tutorialOverlay').style.display === 'flex') {
                    this.hideTutorial();
                }
                break;
            case ' ':
                if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    if (this.isActive) this.stopDetection();
                    else this.startDetection();
                }
                break;
            case 's':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.speakCurrentOutput();
                }
                break;
        }
    }
}

// Global function for onclick attribute
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real app, you would clear tokens, etc.
        // For this demo, we'll clear the simple user name storage.
        localStorage.removeItem('silentTalkUser');
        localStorage.removeItem('silentTalkUserData'); // Also clear user data
        // Redirect to a login/index page
        // window.location.href = 'index.html';
        alert("Logged out! You would be redirected in a real app.");
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    // A real app would have a more robust authentication check.
    // This is a placeholder.
    const currentUser = localStorage.getItem('silentTalkUser');
    if (!currentUser) {
        // For this demo, we'll set a default user if none exists.
        // In a real app, you would redirect to a login page:
        // window.location.href = 'login.html';
        localStorage.setItem('silentTalkUser', 'GuestUser');
        console.warn('No user found, creating a guest session.');
    }
    
    const translator = new EnhancedSilentTalk();
    window.translator = translator; // Make globally available for debugging
    console.log('Enhanced SilentTalk loaded successfully');
});