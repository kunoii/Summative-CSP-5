
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const overlay = document.getElementById('overlay');
    const startBtn = document.getElementById('start-btn');
    const camStart = document.getElementById('cam-start');
    const scanBtn = document.getElementById('scan-btn');
    const scanLine = document.getElementById('scan-line');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const resultPanel = document.getElementById('result-panel');
    const detectedText = document.getElementById('detected-text');
    const aiResult = document.getElementById('ai-result');
    const labelInput = document.getElementById('label-input');
    const saveBtn = document.getElementById('save-btn');
    const savedLabelsDiv = document.getElementById('saved-labels');

    let savedLabels = [];
    let lastDetections = [];
    let stream = null;

    function setStatus(text, mode) {
      statusText.textContent = text;
      statusDot.className = mode || '';
    }

    startBtn.addEventListener('click', async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        camStart.style.display = 'none';
        scanBtn.disabled = false;
        setStatus('Camera active — point at an object and tap Scan', 'active');
      } catch (e) {
        camStart.querySelector('p').textContent = 'Camera access denied. Check browser permissions.';
      }
    });

    function captureFrame() {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }

    function checkSavedLabels(detections) {
      const found = [];
      const lc = detections.map(d => d.toLowerCase());
      for (const saved of savedLabels) {
        for (const kw of saved.keywords) {
          if (lc.some(d => d.includes(kw.toLowerCase()) || kw.toLowerCase().includes(d))) {
            found.push(saved);
            break;
          }
        }
      }
      return found;
    }

    function showOverlayLabels(matches) {
      overlay.innerHTML = '';
      if (!matches.length) return;
      const vw = video.offsetWidth;
      const vh = video.offsetHeight;
      matches.forEach((m, i) => {
        const cx = vw * (0.3 + i * 0.25);
        const cy = vh * 0.4;
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
        dot.setAttribute('r', 7); dot.setAttribute('fill', '#4ade80');
        dot.setAttribute('stroke', '#fff'); dot.setAttribute('stroke-width', 2);
        overlay.appendChild(dot);
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', cx - 70); fo.setAttribute('y', cy - 52);
        fo.setAttribute('width', 140); fo.setAttribute('height', 36);
        fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="background:rgba(0,0,0,0.8);color:#fff;font-size:13px;font-weight:500;padding:5px 10px;border-radius:14px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>`;
        overlay.appendChild(fo);
      });
    }

    function renderSavedPills() {
      savedLabelsDiv.innerHTML = '';
      for (const s of savedLabels) {
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.innerHTML = `<strong>${s.name}</strong><span>${s.keywords.join(', ')}</span>`;
        savedLabelsDiv.appendChild(pill);
      }
    }

    scanBtn.addEventListener('click', async () => {
      if (!stream) return;
      scanBtn.disabled = true;
      scanLine.classList.add('active');
      setStatus('Scanning...', 'scanning');
      overlay.innerHTML = '';

      let base64;
      try { base64 = captureFrame(); }
      catch (e) { setStatus('Could not capture frame', ''); scanBtn.disabled = false; scanLine.classList.remove('active'); return; }

      resultPanel.className = 'show';
      detectedText.innerHTML = 'Analyzing image...';
      aiResult.textContent = '';

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 500,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
                { type: 'text', text: 'You are an accessibility assistant helping people with challenges identify objects. List the main objects you see. Respond ONLY with raw JSON, no markdown: {"objects": ["object1", "object2"], "description": "one friendly sentence describing the scene"}' }
              ]
            }]
          })
        });

        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        let parsed;
        try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
        catch (e) { parsed = { objects: [], description: text }; }

        lastDetections = parsed.objects || [];
        const matches = checkSavedLabels(lastDetections);
        showOverlayLabels(matches);

        const objList = lastDetections.length ? lastDetections.join(', ') : 'nothing specific detected';
        detectedText.innerHTML = `<strong>Detected:</strong> ${objList}`;
        if (matches.length) {
          detectedText.innerHTML += ` — <span style="color:#4ade80">recognized: ${matches.map(m => m.name).join(', ')}</span>`;
        }
        aiResult.textContent = parsed.description || '';
        labelInput.placeholder = lastDetections.length ? `e.g. "${lastDetections[0]}"` : 'Type a label...';
        setStatus('Scan complete', 'active');

      } catch (e) {
        detectedText.innerHTML = '<span style="color:#f87171">Scan failed — check your API key and internet connection</span>';
        console.error(e);
        setStatus('Error', '');
      }

      scanLine.classList.remove('active');
      scanBtn.disabled = false;
    });

    saveBtn.addEventListener('click', () => {
      const name = labelInput.value.trim();
      if (!name) return;
      const keywords = [...new Set([...lastDetections.map(d => d.toLowerCase()), name.toLowerCase()])];
      const existing = savedLabels.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) {
        savedLabels[existing].keywords = [...new Set([...savedLabels[existing].keywords, ...keywords])];
      } else {
        savedLabels.push({ name, keywords });
      }
      labelInput.value = '';
      renderSavedPills();
      showOverlayLabels(checkSavedLabels(lastDetections));
    });

    labelInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });