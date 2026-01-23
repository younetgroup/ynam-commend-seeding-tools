/**
 * Duplication Detection Tab Component
 * Handles duplicate detection workflow
 */

document.addEventListener('DOMContentLoaded', () => {
  const thresholdSlider = document.getElementById('dup-threshold');
  const thresholdValue = document.getElementById('dup-threshold-value');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const startDupBtn = document.getElementById('start-dup-btn');
  const stopDupBtn = document.getElementById('stop-dup-btn');
  const progressSection = document.getElementById('dup-progress');
  const progressFill = document.getElementById('dup-progress-fill');
  const progressStatus = document.getElementById('dup-status');
  const summary = document.getElementById('dup-summary');
  const clustersList = document.getElementById('dup-clusters');

  // Threshold slider
  thresholdSlider.addEventListener('input', (e) => {
    thresholdValue.textContent = e.target.value;
    updatePresetButtons(parseInt(e.target.value));
  });

  // Preset buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.dataset.value);
      thresholdSlider.value = value;
      thresholdValue.textContent = value;
      updatePresetButtons(value);
    });
  });

  function updatePresetButtons(value) {
    presetBtns.forEach(btn => {
      if (parseInt(btn.dataset.value) === value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Start detection
  startDupBtn.addEventListener('click', async () => {
    const options = {
      sheet: window.appState.sheetUrl,
      commentCol: document.getElementById('dup-comment-col').value,
      clusterCol: document.getElementById('dup-cluster-col').value,
      threshold: parseInt(thresholdSlider.value),
      rows: document.getElementById('dup-rows').value,
      verbose: document.getElementById('dup-verbose').checked,
      dryRun: document.getElementById('dup-dry-run').checked
    };

    startDupBtn.classList.add('hidden');
    stopDupBtn.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressStatus.textContent = 'Starting detection...';
    summary.innerHTML = '';
    clustersList.innerHTML = '';

    // Listen for progress updates
    window.electronAPI.onProgressUpdate((progress) => {
      if (progress.percentage) {
        progressFill.style.width = progress.percentage + '%';
      }
      if (progress.message) {
        progressStatus.textContent = progress.message;
      }
      if (progress.stats) {
        updateSummary(progress.stats);
      }
      if (progress.clusters) {
        displayClusters(progress.clusters);
      }
      if (progress.status === 'complete') {
        onDetectionComplete();
      }
      if (progress.status === 'error') {
        onDetectionError(progress.error);
      }
    });

    const result = await window.electronAPI.startDupDetection(options);

    if (!result.success) {
      progressStatus.textContent = `Error: ${result.error}`;
      onDetectionComplete();
    }
  });

  // Stop detection
  stopDupBtn.addEventListener('click', async () => {
    await window.electronAPI.stopDupDetection();
    onDetectionComplete();
  });

  function updateSummary(stats) {
    summary.innerHTML = `
      <h3>📊 Results</h3>
      <ul>
        <li>Total comments: ${stats.totalComments || 0}</li>
        <li>Unique comments: ${stats.uniqueComments || 0}</li>
        <li>Duplicate clusters: ${stats.duplicateClusters || 0}</li>
        <li>Largest cluster: ${stats.largestClusterSize || 0} comments</li>
      </ul>
    `;
  }

  function displayClusters(clusters) {
    if (!clusters || clusters.length === 0) {
      clustersList.innerHTML = '<p>No duplicate clusters found!</p>';
      return;
    }

    clustersList.innerHTML = '<h3>🔍 Duplicate Clusters Found:</h3>';

    clusters.slice(0, 10).forEach(cluster => {
      const clusterDiv = document.createElement('div');
      clusterDiv.className = 'cluster-item';

      const header = document.createElement('div');
      header.className = 'cluster-header';
      header.textContent = `Cluster ${cluster.clusterId} (${cluster.comments.length} comments)`;

      const commentsList = document.createElement('div');
      commentsList.className = 'cluster-comments';

      cluster.comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'cluster-comment';
        commentDiv.textContent = `• Row ${comment.row}: ${comment.text.substring(0, 80)}...`;
        commentsList.appendChild(commentDiv);
      });

      clusterDiv.appendChild(header);
      clusterDiv.appendChild(commentsList);
      clustersList.appendChild(clusterDiv);
    });

    if (clusters.length > 10) {
      const more = document.createElement('p');
      more.style.color = 'var(--text-secondary)';
      more.textContent = `... and ${clusters.length - 10} more clusters`;
      clustersList.appendChild(more);
    }
  }

  function onDetectionComplete() {
    startDupBtn.classList.remove('hidden');
    stopDupBtn.classList.add('hidden');
    window.electronAPI.removeProgressListener();
  }

  function onDetectionError(error) {
    progressStatus.textContent = `Error: ${error}`;
    onDetectionComplete();
  }
});
