// --- START OF FILE app.js (Previous Version - Corrected for TypeError & Search) ---

        // --- DOM Elements ---
        const audioElement = document.getElementById('audio-player');
        const playPauseButton = document.getElementById('play-pause-button');
        const playPauseIcon = document.getElementById('play-pause-icon');
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        const rewindButton = document.getElementById('rewind-button');
        const forwardButton = document.getElementById('forward-button');
        const surahListElement = document.getElementById('surah-list');
        const currentSurahNameElement = document.getElementById('current-surah-name');
        const currentSurahDetailsElement = document.getElementById('current-surah-details');
        const surahSearchInput = document.getElementById('surah-search');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeDisplay = document.getElementById('current-time');
        const totalDurationDisplay = document.getElementById('total-duration');
        const volumeButton = document.getElementById('volume-button');
        const volumeIcon = document.getElementById('volume-icon');
        const volumeSlider = document.getElementById('volume-slider');
        const repeatButton = document.getElementById('repeat-button');
        const repeatIcon = document.getElementById('repeat-icon');
        const repeatText = document.getElementById('repeat-text');
        const reciterSelect = document.getElementById('reciter-select');
        const loadingSurahsIndicator = document.getElementById('loading-surahs');
        const loadingIndicator = document.getElementById('loading-indicator');
        // Quran Text Elements
        const quranTextContainer = document.getElementById('quran-text-container');
        const quranTextLoading = document.getElementById('quran-text-loading'); // Check this ID exists in HTML
        const quranTextContent = document.getElementById('quran-text-content'); // Check this ID exists in HTML
        const quranTextError = document.getElementById('quran-text-error');     // Check this ID exists in HTML
        const DEFAULT_RECITER_ID = 64;
        const ENABLE_DEBUG_LOGGING = false; // Set to true to enable verbose console output
// --- Cache Configuration ---
const RECITERS_CACHE_KEY = 'quranPlayer_recitersCache_v1';
const SURAHS_CACHE_KEY = 'quranPlayer_surahsCache_v1';

// --- Configuration ---
// Define local file paths
const LOCAL_RECITER_ENG_URL = 'https://raw.githubusercontent.com/5tlh/api_data/refs/heads/main/reciters_eng.json';
const LOCAL_RECITER_AR_URL = 'https://raw.githubusercontent.com/5tlh/api_data/refs/heads/main/reciters_ar.json';
const LOCAL_SURAH_AR_LIST_URL = 'https://raw.githubusercontent.com/5tlh/api_data/refs/heads/main/surahs_ar.json';
const LOCAL_SURAH_EN_LIST_URL = 'https://raw.githubusercontent.com/5tlh/api_data/refs/heads/main/surahs_en.json';

const QURAN_TEXT_API_BASE = 'https://api.alquran.cloud/v1/surah'; // Keep for text fetching

// --- Cache Configuration ---
const CACHE_DURATION_MS = 6000 * 60 * 60 * 1000;

        // --- State Variables ---
        let surahData = { en: [], ar: [] }; // Initialize with the expected structure
        let dynamicRecitersData = []; // Will hold the fetched and processed reciter data
        let currentSurahIndex = 0;
        let currentReciter = null; // Initialize as null, will be set after fetching/loading state
        let repeatMode = 'none'; // 'none', 'one', 'all'
        let isPlaying = false;
        let isSeeking = false;
        let savedVolume = 1;
        let surahListItems = []; // To keep track of surah DOM elements for efficient filtering

        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', init);

        // --- Reciter Fetching & Processing (from Local Files) ---
        async function fetchAndProcessReciters() {
            console.log("Loading reciters from local files...");
            dynamicRecitersData = []; // Reset data

            try {
                const [responseEng, responseAr] = await Promise.all([
                    fetch(LOCAL_RECITER_ENG_URL),
                    fetch(LOCAL_RECITER_AR_URL)
                ]);

                if (!responseEng.ok) throw new Error(`Failed to fetch ${LOCAL_RECITER_ENG_URL}: ${responseEng.status} ${responseEng.statusText}`);
                if (!responseAr.ok) throw new Error(`Failed to fetch ${LOCAL_RECITER_AR_URL}: ${responseAr.status} ${responseAr.statusText}`);

                const dataEng = await responseEng.json();
                const dataAr = await responseAr.json();

                 if (!dataEng.reciters || !dataAr.reciters) {
                     throw new Error('Invalid reciter data structure in local files.');
                 }

                const arabicNamesMap = dataAr.reciters.reduce((map, reciter) => {
                    map[reciter.id] = reciter.name;
                    return map;
                }, {});

                const processedReciters = dataEng.reciters.map(reciterEng => {
                    let suitableMoshaf = reciterEng.moshaf.find(m =>
                        m.surah_total === 114 && m.name.toLowerCase().includes("hafs") && m.name.toLowerCase().includes("murattal")
                    ) || reciterEng.moshaf.find(m => m.surah_total === 114)
                      || reciterEng.moshaf.find(m => m.name.toLowerCase().includes("hafs"))
                      || reciterEng.moshaf[0];

                    if (suitableMoshaf && suitableMoshaf.server) {
                        return {
                            id: reciterEng.id,
                            englishName: reciterEng.name,
                            arabicName: arabicNamesMap[reciterEng.id] || reciterEng.name,
                            baseUrl: suitableMoshaf.server
                        };
                    }
                    return null;
                }).filter(reciter => reciter !== null);

                processedReciters.sort((a, b) => a.englishName.localeCompare(b.englishName));
                dynamicRecitersData = processedReciters;
                console.log(`Loaded and processed ${dynamicRecitersData.length} reciters from local files.`);

            } catch (error) {
                console.error("Error loading or processing local reciter files:", error);
                dynamicRecitersData = [];
                throw error;
            }
        }

        // --- UI Update Functions ---
        function showLoading() { if(loadingIndicator) loadingIndicator.classList.remove('hidden'); }
        function hideLoading() { if(loadingIndicator) loadingIndicator.classList.add('hidden'); }

        function populateReciterList() {
            console.log("Populating Reciter List:", dynamicRecitersData);
            if (!reciterSelect) { console.error("Reciter select element not found"); return; }

            reciterSelect.innerHTML = '';

            if (dynamicRecitersData.length === 0) {
                 reciterSelect.innerHTML = '<option value="">No reciters available</option>';
                 return;
            }

            dynamicRecitersData.forEach(reciter => {
                const option = document.createElement('option');
                option.value = reciter.id;
                option.textContent = `${reciter.englishName} - ${reciter.arabicName}`;
                reciterSelect.appendChild(option);
            });

            if (currentReciter && currentReciter.id) {
                 const selectedOption = reciterSelect.querySelector(`option[value="${currentReciter.id}"]`);
                 if (selectedOption) {
                     reciterSelect.value = currentReciter.id;
                 } else {
                      console.warn(`currentReciter ID ${currentReciter.id} not found in dropdown. Defaulting visuals.`);
                      if (reciterSelect.options.length > 0) {
                          reciterSelect.selectedIndex = 0;
                          const firstReciterId = parseInt(reciterSelect.value, 10);
                          currentReciter = dynamicRecitersData.find(r => r.id === firstReciterId) || null;
                      }
                 }
            } else if (dynamicRecitersData.length > 0) {
                 currentReciter = dynamicRecitersData[0];
                 reciterSelect.value = currentReciter.id;
                 console.log("Defaulted reciter selection to first available.");
            }
        }


        function createSurahList() {
            if (!surahListElement) { console.error("Surah list element not found"); return; }
            surahListElement.innerHTML = '';
            surahListItems = [];

            if (!surahData || !surahData.en || !surahData.ar) {
                 console.error("Surah data not loaded correctly for list creation (missing en or ar).");
                 surahListElement.innerHTML = '<div class="text-center text-red-600 p-4">Error: Could not load Surah list data.</div>';
                 return;
            }

            if (surahData.en.length !== surahData.ar.length) {
                console.error("Mismatch between English and Arabic Surah list lengths.");
                surahListElement.innerHTML = '<div class="text-center text-red-600 p-4">Error: Surah list data mismatch.</div>';
                return;
            }

            surahData.en.forEach((surah, index) => {
                const surahElement = document.createElement('div');
                surahElement.classList.add('surah-item', 'p-2.5', 'rounded', 'cursor-pointer', 'flex', 'justify-between', 'items-center', 'text-sm');
                surahElement.dataset.index = index;

                const arabicName = surahData.ar[index]?.name || "[Missing Arabic Name]";
                const englishName = surah.name || "[Missing English Name]";

                surahElement.innerHTML = `
                    <div>
                        <span class="font-semibold text-blue-600">${surah.id}.</span>
                        <span class="ml-2">${englishName}</span>
                    </div>
                    <span class="arabic-text text-gray-600">${arabicName}</span>
                `;
                surahElement.addEventListener('click', () => {
                    if (currentSurahIndex !== index) {
                        currentSurahIndex = index;
                        loadAndPlaySurah(currentSurahIndex);
                    } else {
                        togglePlayPause();
                    }
                });
                surahListElement.appendChild(surahElement);
                surahListItems.push({ element: surahElement, surah: surah }); // Store the English surah obj
            });
             highlightActiveSurah();
        }

         function highlightActiveSurah() {
            if (!surahListElement) return;
            document.querySelectorAll('.surah-item.active').forEach(item => item.classList.remove('active'));
            const activeItem = surahListElement.querySelector(`.surah-item[data-index="${currentSurahIndex}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                // Check if element is visible before scrolling
                if (activeItem.offsetParent !== null) {
                     activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
         }

         function updateUIForCurrentSurah() {
            // Ensure elements exist
            if (!currentSurahNameElement || !currentSurahDetailsElement || !audioElement || !progressBar || !currentTimeDisplay || !totalDurationDisplay) {
                console.error("One or more essential UI elements are missing.");
                return;
            }

            if (!currentReciter) {
                console.warn("Cannot update UI for Surah: No reciter selected");
                currentSurahNameElement.textContent = 'Select a Reciter';
                currentSurahDetailsElement.textContent = '';
                return;
            }

            if (!surahData || !surahData.en || surahData.en.length === 0 || !surahData.ar || surahData.ar.length === 0) {
                  console.warn("Cannot update UI for Surah: No Surah data available.");
                  currentSurahNameElement.textContent = 'Surah Data Error';
                  currentSurahDetailsElement.textContent = 'Check api_data/*.json files.';
                  return;
            }

             if (currentSurahIndex < 0 || currentSurahIndex >= surahData.en.length || currentSurahIndex >= surahData.ar.length) {
                 console.error("Cannot update UI: Index value out of bounds!", { currentSurahIndex, enLength: surahData.en.length, arLength: surahData.ar.length });
                 currentSurahNameElement.textContent = 'Error: Invalid Index';
                 currentSurahDetailsElement.textContent = '';
                 return;
             }

            const surah = surahData.en[currentSurahIndex];
            const surahAr = surahData.ar[currentSurahIndex];

             if (!surah || !surahAr) {
                 console.error("Cannot update UI: Surah object missing at index", currentSurahIndex);
                 return;
             }

            const surahNumber = String(surah.id).padStart(3, '0');
            const audioSrc = `${currentReciter.baseUrl}${surahNumber}.mp3`;

            if (audioElement.src !== audioSrc) {
                console.log(`Setting audio source to: ${audioSrc}`);
                audioElement.src = audioSrc;
                audioElement.load(); // Load new source
                progressBar.value = 0;
                currentTimeDisplay.textContent = formatTime(0);
                totalDurationDisplay.textContent = formatTime(0);
                disableSeekButtons();
            }

            currentSurahNameElement.textContent = `${surah.id}. ${surah.name}`;
             currentSurahDetailsElement.innerHTML = `
                <span class="arabic-text text-lg">${surahAr.name}</span> |
                Pg ${surah.start_page}-${surah.end_page} | ${surah.makkia === 1 ? 'Makkiyah' : 'Madaniyah'}
            `;

            highlightActiveSurah();
            updateNavButtons();
            saveState(); // Save state after successful UI update

            // Fetch the Quran text
            //fetchAndDisplayQuranText(surah.id);
        }

        function updatePlayerUI() {
            if (!playPauseIcon || !playPauseButton) return;
            if (isPlaying) {
                playPauseIcon.classList.replace('fa-play', 'fa-pause');
                playPauseButton.title = "Pause (Spacebar)";
            } else {
                playPauseIcon.classList.replace('fa-pause', 'fa-play');
                 playPauseButton.title = "Play (Spacebar)";
            }
        }

        function updateNavButtons() {
            if (!prevButton || !nextButton) return;
             const surahCount = (surahData && surahData.en) ? surahData.en.length : 0;
             prevButton.disabled = currentSurahIndex === 0;
             nextButton.disabled = surahCount === 0 || (currentSurahIndex >= surahCount - 1 && repeatMode !== 'all');
        }

        function updateRepeatButtonUI() {
            if (!repeatButton || !repeatIcon || !repeatText) return;
            repeatButton.classList.remove('bg-blue-600', 'text-white', 'bg-white', 'text-gray-600', 'border', 'border-gray-300', 'hover:bg-gray-50');

            switch (repeatMode) {
                case 'one':
                    repeatIcon.className = 'fas fa-redo';
                    repeatText.textContent = 'Repeat One';
                    repeatButton.title = 'Repeating Current Surah';
                    repeatButton.classList.add('bg-blue-600', 'text-white');
                    break;
                case 'all':
                    repeatIcon.className = 'fas fa-infinity';
                    repeatText.textContent = 'Repeat All';
                    repeatButton.title = 'Repeating All Surahs';
                    repeatButton.classList.add('bg-blue-600', 'text-white');
                    break;
                default: // 'none'
                    repeatIcon.className = 'fas fa-arrow-right';
                    repeatText.textContent = 'Play Next';
                    repeatButton.title = 'Play Next Surah Automatically';
                    repeatButton.classList.add('bg-white', 'hover:bg-gray-50', 'text-gray-600', 'border', 'border-gray-300');
                    break;
            }
             updateNavButtons();
        }

        function updateVolumeUI(volume, muted) {
             if (!volumeSlider || !audioElement || !volumeIcon || !volumeButton) return;
             volumeSlider.value = muted ? 0 : volume;
             audioElement.volume = muted ? 0 : volume;
             audioElement.muted = muted;

             if (muted || volume === 0) {
                 volumeIcon.className = 'fas fa-volume-mute';
                 volumeButton.title = "Unmute";
             } else if (volume < 0.5) {
                 volumeIcon.className = 'fas fa-volume-low';
                 volumeButton.title = "Mute";
             } else {
                 volumeIcon.className = 'fas fa-volume-high';
                 volumeButton.title = "Mute";
             }
        }

        // --- Playback Logic ---
        function loadAndPlaySurah(index) {
            if (!currentReciter) {
                console.error("Cannot load/play surah: Reciter is missing!");
                return;
            }
            if (!surahData || !surahData.en || index < 0 || index >= surahData.en.length) {
                console.error("Cannot load/play surah: Surah data invalid or index out of bounds.", { index, count: surahData?.en?.length });
                if(currentSurahNameElement) currentSurahNameElement.textContent = 'Error: Surah Not Found';
                if(currentSurahDetailsElement) currentSurahDetailsElement.textContent = '';
                 disableSeekButtons();
                return;
            }

            currentSurahIndex = index;
            updateUIForCurrentSurah(); // This now sets the src and calls fetchAndDisplayQuranText

            // Check if src was actually set before playing
            if (!audioElement.src) {
                 console.error("Audio source was not set correctly in updateUIForCurrentSurah.");
                 disableSeekButtons();
                 return;
            }

            audioElement.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayerUI();
                }).catch(error => {
                    console.error("Error playing audio:", error);
                    isPlaying = false;
                    updatePlayerUI();
                    disableSeekButtons();
                });
        }

        function togglePlayPause() {
             if (!audioElement) return;
            if (!audioElement.src || audioElement.src === window.location.href || audioElement.readyState < 1 ) {
                 if (!currentReciter || !surahData || !surahData.en || surahData.en.length === 0) {
                     console.warn("Cannot play: No reciter selected or Surah list empty.");
                     return;
                 }
                 console.log("Audio source not ready or invalid, attempting to load and play current surah.");
                 loadAndPlaySurah(currentSurahIndex);
                 return;
            }
            if (audioElement.paused) {
                audioElement.play().then(() => {
                     isPlaying = true;
                     updatePlayerUI();
                }).catch(error => {
                    console.error("Play error:", error);
                    isPlaying = false;
                    updatePlayerUI();
                });
            } else {
                audioElement.pause();
            }
        }

        function playNext() {
             if (!nextButton || nextButton.disabled) return;

             const surahCount = (surahData && surahData.en) ? surahData.en.length : 0;
             if (surahCount === 0) return; // No surahs to navigate

            if (currentSurahIndex < surahCount - 1) {
                currentSurahIndex++;
                loadAndPlaySurah(currentSurahIndex);
            } else if (repeatMode === 'all') {
                currentSurahIndex = 0;
                loadAndPlaySurah(currentSurahIndex);
            } else {
                 isPlaying = false;
                 updatePlayerUI();
            }
        }

        function playPrev() {
            if (!prevButton || prevButton.disabled) return;
            if (currentSurahIndex > 0) {
                currentSurahIndex--;
                loadAndPlaySurah(currentSurahIndex);
            }
        }

        function rewind10Seconds() {
            if (!rewindButton || rewindButton.disabled || !audioElement || !audioElement.duration) return;
            const newTime = Math.max(0, audioElement.currentTime - 10);
            audioElement.currentTime = newTime;
            if (audioElement.paused) handleTimeUpdate();
        }

        function forward10Seconds() {
             if (!forwardButton || forwardButton.disabled || !audioElement || !audioElement.duration) return;
             const newTime = Math.min(audioElement.duration, audioElement.currentTime + 10);
             audioElement.currentTime = newTime;
             if (audioElement.paused) handleTimeUpdate();
        }

        // --- Event Handlers ---
        function setupEventListeners() {
            // Add checks to ensure elements exist before adding listeners
            if (playPauseButton) playPauseButton.addEventListener('click', togglePlayPause); else console.error("playPauseButton not found");
            if (nextButton) nextButton.addEventListener('click', playNext); else console.error("nextButton not found");
            if (prevButton) prevButton.addEventListener('click', playPrev); else console.error("prevButton not found");
            if (rewindButton) rewindButton.addEventListener('click', rewind10Seconds); else console.error("rewindButton not found");
            if (forwardButton) forwardButton.addEventListener('click', forward10Seconds); else console.error("forwardButton not found");
            if (surahSearchInput) surahSearchInput.addEventListener('input', filterSurahs); else console.error("surahSearchInput not found");
            if (reciterSelect) reciterSelect.addEventListener('change', handleReciterChange); else console.error("reciterSelect not found");

            if (audioElement) {
                audioElement.addEventListener('play', () => { isPlaying = true; updatePlayerUI(); });
                audioElement.addEventListener('pause', () => { isPlaying = false; updatePlayerUI(); saveState(); });
                audioElement.addEventListener('ended', handleAudioEnd);
                audioElement.addEventListener('timeupdate', handleTimeUpdate);
                audioElement.addEventListener('loadedmetadata', handleMetadataLoaded);
                audioElement.addEventListener('volumechange', handleVolumeChange);
                audioElement.addEventListener('waiting', showLoading);
                audioElement.addEventListener('canplay', () => {
                    if(audioElement.duration) enableSeekButtons();
                    hideLoading();
                });
                audioElement.addEventListener('error', handleAudioError);
            } else { console.error("audioElement not found"); }


            if (progressBar) {
                progressBar.addEventListener('input', () => { isSeeking = true; });
                progressBar.addEventListener('change', () => {
                     if(audioElement && audioElement.duration) audioElement.currentTime = progressBar.value;
                     isSeeking = false;
                });
            } else { console.error("progressBar not found"); }

            if (volumeSlider) {
                volumeSlider.addEventListener('input', () => {
                    const newVolume = parseFloat(volumeSlider.value);
                    savedVolume = newVolume;
                    updateVolumeUI(newVolume, false);
                    saveState();
                });
            } else { console.error("volumeSlider not found"); }

            if (volumeButton) volumeButton.addEventListener('click', toggleMute); else console.error("volumeButton not found");
            if (repeatButton) repeatButton.addEventListener('click', cycleRepeatMode); else console.error("repeatButton not found");

            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                switch (e.code) {
                    case 'Space':
                        e.preventDefault(); togglePlayPause(); break;
                     case 'ArrowRight':
                        e.preventDefault(); forward10Seconds(); break;
                     case 'ArrowLeft':
                        e.preventDefault(); rewind10Seconds(); break;
                }
            });
        }

        function handleAudioEnd() {
             saveState();
             if (repeatMode === 'one') {
                 if(audioElement) {
                    audioElement.currentTime = 0;
                    audioElement.play().catch(e => console.error("Replay error:", e));
                 }
             } else {
                playNext();
            }
        }

        function handleTimeUpdate() {
            if (!isSeeking && audioElement && audioElement.duration && progressBar && currentTimeDisplay) {
                progressBar.value = audioElement.currentTime;
                currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
            }
        }

        function handleMetadataLoaded() {
             if (!audioElement || !audioElement.duration || !progressBar || !totalDurationDisplay) return;
             progressBar.max = audioElement.duration;
             totalDurationDisplay.textContent = formatTime(audioElement.duration);
             enableSeekButtons();
             hideLoading();
        }

        function handleVolumeChange() {
             if (!audioElement) return;
             updateVolumeUI(audioElement.volume, audioElement.muted);
         }

         function handleAudioError() {
              console.error("Audio playback error:", audioElement?.error?.message || 'Unknown audio error');
              hideLoading();
              if(currentSurahDetailsElement) {
                 const errorMsg = ` (Error: ${audioElement?.error?.message || 'Could not load audio'})`;
                 if (!currentSurahDetailsElement.innerHTML.includes(errorMsg)){
                    currentSurahDetailsElement.innerHTML += errorMsg;
                 }
              }
              isPlaying = false;
              updatePlayerUI();
              disableSeekButtons();
         }

        function handleReciterChange() {
            if (!reciterSelect || !dynamicRecitersData || !audioElement) return;

            const selectedId = parseInt(reciterSelect.value, 10);
            const selectedReciter = dynamicRecitersData.find(r => r.id === selectedId);

            if (!selectedReciter) {
                console.error(`Could not find reciter data for selected ID: ${selectedId}`);
                return;
            }

            currentReciter = selectedReciter;
            console.log("Reciter changed to:", currentReciter.englishName);

            const wasPlaying = isPlaying;

            audioElement.pause();
            audioElement.removeAttribute('src');
            audioElement.load();

            isPlaying = false;
            updatePlayerUI();
            if(progressBar) progressBar.value = 0;
            if(currentTimeDisplay) currentTimeDisplay.textContent = formatTime(0);
            if(totalDurationDisplay) totalDurationDisplay.textContent = formatTime(0);
            disableSeekButtons();

            updateUIForCurrentSurah(); // Sets new src, updates details, fetches text

             if (wasPlaying && surahData && surahData.en && surahData.en[currentSurahIndex]) {
                 audioElement.addEventListener('canplay', () => {
                     // Check if still should be playing, maybe user paused manually in between
                     if(isPlaying) {
                        audioElement.play().catch(e => console.error("Error resuming play after reciter change:", e));
                     }
                 }, { once: true });
                 audioElement.load(); // Re-trigger load to ensure canplay fires for the new source
             }

            saveState();
        }

        // --- CORRECTED filterSurahs for the OLD data structure & Arabic Search ---
        function filterSurahs() {
            if (!surahSearchInput || !surahListItems || !surahData || !surahData.en || !surahData.ar || !loadingSurahsIndicator) {
                console.error("Filter Surahs prerequisites missing.");
                return;
            }

            const searchTermLower = surahSearchInput.value.toLowerCase().trim(); // For English/ID
            const searchTermArabic = surahSearchInput.value.trim(); // For Arabic (keep case/diacritics)

            console.log(`Filtering Surahs with terms: "${searchTermLower}" / "${searchTermArabic}"`);

            surahListItems.forEach((item, index) => {
                const surahEn = item.surah; // English surah object {id, name, ...}

                if (!surahEn || !item.element) {
                    console.warn(`Skipping item at index ${index}: Surah object or element is missing.`);
                    if(item.element) item.element.classList.add('hidden');
                    return;
                }

                // Get English name and ID
                const englishNameLower = surahEn.name ? surahEn.name.toLowerCase() : '';
                const surahIdString = String(surahEn.id || '');

                // Get corresponding Arabic name safely
                const surahAr = surahData.ar[index];
                const arabicName = surahAr?.name || '';

                // Visibility check
                const isVisible = searchTermArabic === '' || // Show all if search is empty
                                  (surahEn.name && englishNameLower.includes(searchTermLower)) ||
                                  surahIdString.startsWith(searchTermLower) || // ID check should be fine with lowercase
                                  (arabicName && arabicName.includes(searchTermArabic)); // Arabic check

                item.element.classList.toggle('hidden', !isVisible);
            });

            // Update "no results" indicator
            const visibleCount = surahListItems.filter(item => item.element && !item.element.classList.contains('hidden')).length;
            console.log(`Filtering complete. Visible count: ${visibleCount}`);

            loadingSurahsIndicator.classList.toggle('hidden', visibleCount > 0 || searchTermArabic === '');
            if (visibleCount === 0 && searchTermArabic !== '') {
                 loadingSurahsIndicator.textContent = 'No matching Surahs found.';
            } else {
                 // Clear or reset text if needed when results found or search empty
                 loadingSurahsIndicator.textContent = ''; // Clear message
            }
        }
        // --- END OF CORRECTED filterSurahs ---


        function toggleMute() {
             if (!audioElement) return;
             if (audioElement.muted || audioElement.volume === 0) {
                 const volumeToRestore = savedVolume > 0.01 ? savedVolume : 1;
                 updateVolumeUI(volumeToRestore, false);
             } else {
                 savedVolume = audioElement.volume;
                 updateVolumeUI(savedVolume, true);
             }
             saveState();
        }

        function cycleRepeatMode() {
            if (repeatMode === 'none') repeatMode = 'one';
            else if (repeatMode === 'one') repeatMode = 'all';
            else repeatMode = 'none';
            updateRepeatButtonUI();
            saveState();
        }

        function disableSeekButtons() {
            if(rewindButton) rewindButton.disabled = true;
            if(forwardButton) forwardButton.disabled = true;
        }
        function enableSeekButtons() {
             if(audioElement && audioElement.duration && audioElement.readyState >= 2) {
                if(rewindButton) rewindButton.disabled = false;
                if(forwardButton) forwardButton.disabled = false;
             } else {
                disableSeekButtons(); // Keep disabled if conditions not met
             }
         }

// --- Initialization ---
async function init() {
    // Ensure essential elements used early exist
    if (!loadingIndicator || !reciterSelect || !surahListElement || !loadingSurahsIndicator) {
         console.error("Critical UI elements missing, cannot initialize.");
         // Display a user-facing error message in the body or a dedicated error div
         document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">Error: Player UI components failed to load. Please check the HTML structure.</div>';
         return;
    }

    showLoading();
    setupEventListeners(); // Setup listeners early, but functions should check elements
    disableSeekButtons();

    try {
        loadingSurahsIndicator.textContent = 'Loading Reciters...';
        loadingSurahsIndicator.classList.remove('hidden');

        try {
             await fetchAndProcessReciters();
        } catch (fetchError) {
            console.error("Reciter fetch/process failed:", fetchError);
            // Let the length check below handle UI
        }
        if(dynamicRecitersData.length === 0) {
            reciterSelect.innerHTML = `<option value="">Error loading reciters</option>`;
            console.error("Reciter loading failed or resulted in empty list.");
        } else {
            populateReciterList();
        }

        loadState(); // Load state after reciters are potentially available

        // Set/Validate currentReciter
        let foundReciterFromState = false;
        if (currentReciter && currentReciter.id && dynamicRecitersData.some(r => r.id === currentReciter.id)) {
             console.log("Reciter found from loaded state:", currentReciter.englishName);
             foundReciterFromState = true;
             if (reciterSelect.options.length > 0) reciterSelect.value = currentReciter.id;
        }

        if (!foundReciterFromState && dynamicRecitersData.length > 0) {
            let targetReciter = dynamicRecitersData.find(r => r.id === DEFAULT_RECITER_ID);
            if (targetReciter) {
                currentReciter = targetReciter;
                console.log("Setting reciter to default ID:", DEFAULT_RECITER_ID);
            } else {
                currentReciter = dynamicRecitersData[0];
                console.log("Default reciter ID not found, defaulting to first:", currentReciter.englishName);
            }
            if (reciterSelect.options.length > 0) reciterSelect.value = currentReciter.id;
        }
        // currentReciter should now be set if dynamicRecitersData loaded.

        loadingSurahsIndicator.textContent = 'Loading Surahs...';
        console.log("Loading Surah data...");

        const [surahResponseEn, surahResponseAr] = await Promise.all([
             fetch(LOCAL_SURAH_EN_LIST_URL),
             fetch(LOCAL_SURAH_AR_LIST_URL)
         ]);

        if (!surahResponseEn.ok) throw new Error(`Fetch failed: ${LOCAL_SURAH_EN_LIST_URL} (${surahResponseEn.status})`);
        if (!surahResponseAr.ok) throw new Error(`Fetch failed: ${LOCAL_SURAH_AR_LIST_URL} (${surahResponseAr.status})`);

         const surahApiDataEn = await surahResponseEn.json();
         const surahApiDataAr = await surahResponseAr.json();

        if (surahApiDataEn?.suwar && surahApiDataAr?.suwar) {
             surahData = { en: surahApiDataEn.suwar, ar: surahApiDataAr.suwar };
             if (surahData.en.length === 0 || surahData.ar.length === 0) throw new Error('Surah list data is empty.');
             if (surahData.en.length !== surahData.ar.length) throw new Error('Surah list length mismatch.');
             console.log(`Loaded ${surahData.en.length} Surahs.`);
         } else {
             throw new Error('Invalid structure in Surah data files (missing "suwar" key?).');
         }

        loadingSurahsIndicator.classList.add('hidden');
        createSurahList();

        // Final Validation
        const surahCount = surahData.en.length;
        if (currentSurahIndex < 0 || currentSurahIndex >= surahCount) {
           console.warn(`Current Surah index ${currentSurahIndex} invalid. Resetting to 0.`);
           currentSurahIndex = 0;
        }

        if (!currentReciter) {
             // This should only happen if reciter loading failed critically
             throw new Error("Initialization failed: No reciters available.");
         }

        updateUIForCurrentSurah(); // Final update with validated state

    } catch (error) {
        console.error("Error during initialization:", error);
        loadingSurahsIndicator.textContent = `Error: ${error.message}. Check console & files.`;
        loadingSurahsIndicator.classList.remove('hidden');
        if (reciterSelect) { reciterSelect.innerHTML = `<option value="">Error</option>`; reciterSelect.disabled = true; }
        if (surahListElement) surahListElement.innerHTML = `<div class="text-center text-red-600 p-4">Error loading list.</div>`;
        if (quranTextError) { quranTextError.textContent = `Failed to initialize: ${error.message}`; quranTextError.classList.remove('hidden'); }
        if (quranTextLoading) quranTextLoading.classList.add('hidden');
        if (currentSurahNameElement) currentSurahNameElement.textContent = 'Error';
        if (currentSurahDetailsElement) currentSurahDetailsElement.textContent = 'Initialization failed.';
        disableSeekButtons();
        if(prevButton) prevButton.disabled = true;
        if(nextButton) nextButton.disabled = true;
        if(playPauseButton) playPauseButton.disabled = true;
        if(surahSearchInput) surahSearchInput.disabled = true;
    } finally {
         hideLoading();
    }
}


// --- Quran Text Fetching (from External API - With DOM checks) ---
async function fetchAndDisplayQuranText(surahNumber) {
    // --- Add checks at the beginning ---
    if (!quranTextLoading || !quranTextContent || !quranTextError) {
        console.error("Quran text display elements not found in the DOM. Aborting text fetch.");
        if (quranTextContainer) quranTextContainer.classList.add('hidden');
        return;
    }
    // --- End checks ---

    quranTextLoading.classList.remove('hidden');
    quranTextContent.innerHTML = '';
    quranTextError.classList.add('hidden');
    quranTextContent.scrollTop = 0;

    const textApiUrl = `${QURAN_TEXT_API_BASE}/${surahNumber}/quran-uthmani`;
    console.log(`Fetching Quran text from: ${textApiUrl}`);

    try {
        const response = await fetch(textApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error fetching text! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.code === 200 && data.data && data.data.ayahs) {
            const fragment = document.createDocumentFragment();

             if (surahNumber !== 1 && surahNumber !== 9) {
                 const bismillah = document.createElement('div');
                 bismillah.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"; // Ensure correct UTF-8
                 bismillah.classList.add('text-center', 'mb-3', 'font-semibold', 'text-lg', 'arabic-text');
                 fragment.appendChild(bismillah);
             }

            data.data.ayahs.forEach(ayah => {
                const ayahSpan = document.createElement('span');
                const ayahNumSymbol = `\u06dd${toArabicNumeral(ayah.numberInSurah)}\u06de`; // Convert number to Arabic numeral
                ayahSpan.textContent = ayah.text + ayahNumSymbol + ' '; // Use Arabic numeral
                ayahSpan.dataset.ayahNumber = ayah.numberInSurah;
                ayahSpan.classList.add('inline', 'arabic-text');
                fragment.appendChild(ayahSpan);
            });
            quranTextContent.appendChild(fragment);
        } else {
            throw new Error(`Invalid Quran text data structure from API (Code: ${data.code}).`);
        }

    } catch (error) {
        console.error("Error fetching Quran text:", error);
        quranTextError.textContent = `Error loading text: ${error.message}`;
        quranTextError.classList.remove('hidden');
    } finally {
        // Safely hide loading indicator
        quranTextLoading.classList.add('hidden');
    }
}

        // --- Utility Functions ---
        function formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '00:00';
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        // Helper function to convert Western numerals to Eastern Arabic numerals
        function toArabicNumeral(num) {
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            return String(num).split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
        }


        // --- Persistence (LocalStorage) ---
        const STORAGE_KEY = 'quranPlayerState_v3';

        function saveState() {
             // Added more detailed check
             if (!surahData || !surahData.en || surahData.en.length === 0 || !currentReciter || currentReciter.id === undefined) {
                 console.warn("Skipping saveState: Essential data missing.", { hasSurahData: !!(surahData && surahData.en), len: surahData?.en?.length, hasReciter: !!currentReciter, id: currentReciter?.id });
                 return;
             }
            // Validate index before saving
            if (currentSurahIndex < 0 || currentSurahIndex >= surahData.en.length) {
                console.warn(`Skipping saveState: Invalid surahIndex ${currentSurahIndex}`);
                return;
            }

            const state = {
                surahIndex: currentSurahIndex,
                reciterId: currentReciter.id,
                volume: audioElement ? audioElement.volume : 1, // Add check
                savedVolume: savedVolume,
                isMuted: audioElement ? audioElement.muted : false, // Add check
                repeatMode: repeatMode,
            };
             try {
                 localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
             } catch (e) {
                 console.error("Error saving state to localStorage:", e);
             }
        }

        function loadState() {
            let loadedReciterId = DEFAULT_RECITER_ID; // Default target ID
            currentSurahIndex = 0; // Default index
            currentReciter = null; // Start null, let logic below set it

           try {
                const savedState = localStorage.getItem(STORAGE_KEY);
                if (savedState) {
                    const state = JSON.parse(savedState);
                    console.log("Loading saved state:", state);

                    if (state.reciterId !== undefined) loadedReciterId = parseInt(state.reciterId, 10);
                    // Load index, validation happens later in init
                    if (state.surahIndex !== undefined) currentSurahIndex = state.surahIndex;

                    savedVolume = state.savedVolume !== undefined ? state.savedVolume : 1;
                    // Apply volume/mute directly as audioElement should exist by now if init progresses
                    if (audioElement) {
                        updateVolumeUI(state.isMuted ? (state.savedVolume || 0) : (state.volume !== undefined ? state.volume : 1), state.isMuted || false);
                    }

                    repeatMode = ['none', 'one', 'all'].includes(state.repeatMode) ? state.repeatMode : 'none';
                    updateRepeatButtonUI();

                } else {
                    console.log("No saved state found. Applying defaults.");
                    savedVolume = 1;
                    if(audioElement) updateVolumeUI(1, false);
                    repeatMode = 'none';
                    updateRepeatButtonUI();
                }
           } catch (e) {
                console.error("Error loading state from localStorage:", e);
                 savedVolume = 1;
                 if(audioElement) updateVolumeUI(1, false);
                 repeatMode = 'none';
                 updateRepeatButtonUI();
           }

           // Attempt to find the targeted reciter (loaded or default)
           // This runs *before* init finishes, so dynamicRecitersData might be empty
           if (dynamicRecitersData.length > 0) {
                const foundReciter = dynamicRecitersData.find(r => r.id === loadedReciterId);
                if (foundReciter) {
                    currentReciter = foundReciter;
                    console.log("Reciter set in loadState based on target ID:", currentReciter.englishName);
                } else {
                    console.warn(`Targeted reciter ID ${loadedReciterId} not found in dynamic list.`);
                    // currentReciter remains null, init will handle default
                }
           } else {
               console.log("Reciters not loaded yet, cannot set currentReciter in loadState.");
           }

           // Update dropdown visually *if* currentReciter was successfully set AND dropdown exists
           if (reciterSelect && reciterSelect.options.length > 0 && currentReciter && currentReciter.id) {
                reciterSelect.value = currentReciter.id;
           }
           // updateNavButtons(); // Call in init after surahData is confirmed
       }

// --- END OF FILE app.js (Previous Version - Corrected for TypeError & Search) ---
