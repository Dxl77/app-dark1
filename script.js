async function gerarVideo() {
    const audioInput = document.getElementById('audioInput').files[0];
    const imageFiles = Array.from(document.getElementById('imageInput').files);
    const status = document.getElementById('status');
    const canvas = document.getElementById('videoCanvas');
    const ctx = canvas.getContext('2d');

    if (!audioInput || imageFiles.length === 0) {
        status.innerText = "❌ Selecione o arquivo de áudio e pelo menos 1 imagem!";
        return;
    }

    status.innerText = "⏳ Carregando áudio e imagens...";

    // 1. Carregar Áudio
    const audioUrl = URL.createObjectURL(audioInput);
    const audio = new Audio(audioUrl);

    await new Promise(resolve => {
        audio.onloadedmetadata = resolve;
    });

    const duracaoTotal = audio.duration;
    const tempoPorImg = duracaoTotal / imageFiles.length;

    // 2. Carregar todas as imagens
    const imagens = await Promise.all(imageFiles.map(file => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => resolve(img);
        });
    }));

    status.innerText = `🎬 Processando vídeo (${duracaoTotal.toFixed(1)}s total)... Mantenha a aba aberta.`;

    // 3. Configurar gravação do Canvas via MediaRecorder
    const canvasStream = canvas.captureStream(30); // 30 FPS
    
    // Conectar o áudio do elemento HTML ao stream do gravador
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination); // Para tocar enquanto grava

    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        
        // Criar link para baixar o vídeo pronto
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = "video_dark_final.mp4";
        a.click();

        status.innerText = "✅ Vídeo gerado e baixado com sucesso!";
    };

    recorder.start();
    audio.play();

    let startTime = Date.now();

    function renderFrame() {
        const elapsed = (Date.now() - startTime) / 1000;

        if (elapsed >= duracaoTotal) {
            recorder.stop();
            audio.pause();
            return;
        }

        // Descobrir qual imagem exibir no tempo atual
        const idx = Math.min(Math.floor(elapsed / tempoPorImg), imagens.length - 1);
        const img = imagens[idx];

        // Desenhar a imagem no canvas ajustando proporção 16:9
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        requestAnimationFrame(renderFrame);
    }

    renderFrame();
}