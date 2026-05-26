document.addEventListener('DOMContentLoaded', () => {
    const cameraStage = document.getElementById('camera-stage');
    const menuTrigger = document.getElementById('menu-trigger');
    const menuOverlay = document.getElementById('menu-overlay');
    const flash = document.getElementById('flash-overlay');
    const welcomePopup = document.getElementById('welcome-popup');
    const lnkGreeting = document.getElementById('lnk-greeting');

    // --- オープニング演出終了後のズーム倍率を設定 ---
    const DEFAULT_SCALE = 1.4; 
    
    let currentScale = DEFAULT_SCALE;
    let startScale = DEFAULT_SCALE;
    
    let isDragging = false;
    let isPinching = false;
    
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;
    let currentTranslateX = 0, currentTranslateY = 0;
    let startTouchDist = 0;
    
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    let touchStartTime = 0;

    // ------------------------------------------
    // A. 初期オープニング演出（「戻る」時のポップアップ表示もスキップ）
    // ------------------------------------------
    // セッションストレージを確認し、すでに訪問済みかチェック
    const hasVisited = sessionStorage.getItem('has_visited_hare606');

    if (hasVisited) {
        // 【戻ってきたとき】アニメーションもポップアップもスキップ
        // 瞬時に transition を切り、初期クラスを削除して等倍（1.4倍）にする
        cameraStage.style.transition = 'none';
        cameraStage.classList.remove('is-zoomed');
        
        // メニューボタンとイラスト操作を即座に有効化（ポップアップは表示させない）
        if (menuTrigger) menuTrigger.classList.add('is-visible');
        initPanAndPinchControls();
        
        // 次の描画タイミングでtransitionを通常の操作用に元に戻す
        requestAnimationFrame(() => {
            cameraStage.style.transition = '';
        });
    } else {
        // 【初回訪問のとき】通常通りダイナミックなアニメーションを再生し、ポップアップも出す
        setTimeout(() => {
            cameraStage.classList.remove('is-zoomed');
        }, 500);

        setTimeout(() => {
            if (menuTrigger) menuTrigger.classList.add('is-visible');
            initPanAndPinchControls();
            
            // 初回のみポップアップをふわっと表示
            welcomePopup.classList.add('is-show');
            
            // 初回完了した時点で「訪問済み」のフラグを立てる
            sessionStorage.setItem('has_visited_hare606', 'true');
        }, 2000);
    }

    // ------------------------------------------
    // ポップアップのクローズ処理
    // ------------------------------------------
    welcomePopup.addEventListener('click', () => {
        welcomePopup.classList.remove('is-show');
    });

    // ------------------------------------------
    // B. メニュー開閉
    // ------------------------------------------
    menuTrigger.addEventListener('click', () => {
        menuTrigger.classList.toggle('is-active');
        menuOverlay.classList.toggle('is-open');
    });

    // 「ご挨拶」メニューをクリックしたとき
    lnkGreeting.addEventListener('click', (e) => {
        e.preventDefault();
        // メニューを閉じてポップアップを再表示
        menuTrigger.classList.remove('is-active');
        menuOverlay.classList.remove('is-open');
        welcomePopup.classList.add('is-show');
    });

    // ------------------------------------------
    // C. 超高速ズームイン遷移ロジック
    // ------------------------------------------
    function zoomIntoElement(targetX, targetY, targetUrl) {
        disablePanAndPinchControls();

        menuOverlay.classList.remove('is-open');
        menuTrigger.classList.remove('is-visible');
        menuTrigger.classList.remove('is-active');

        cameraStage.style.transform = 'none';
        cameraStage.style.transformOrigin = `${targetX} ${targetY}`;

        requestAnimationFrame(() => {
            setTimeout(() => {
                cameraStage.classList.add('is-transitioning');
            }, 50);
        });

        setTimeout(() => {
            flash.classList.add('is-active');
        }, 550);

        setTimeout(() => {
            window.location.href = targetUrl;
        }, 650);
    }

    // 2点間の距離を計算（ピンチ用）
    function getTouchDistance(touches) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ------------------------------------------
    // E. スワイプ＆ピンチ イベントハンドラ
    // ------------------------------------------
    function handleStart(e) {
        if (cameraStage.classList.contains('is-zoomed') || cameraStage.classList.contains('is-transitioning')) return;
        // ポップアップが出ている間はイラスト側のドラッグイベントを開始させない
        if (welcomePopup.classList.contains('is-show')) return;

        touchStartTime = Date.now();
        cameraStage.classList.add('is-dragging');

        if (e.type === 'touchstart' && e.touches.length >= 2) {
            isPinching = true;
            isDragging = false;
            startTouchDist = getTouchDistance(e.touches);
            startScale = currentScale;
        } else if (!isPinching) {
            isDragging = true;
            const pageX = e.type === 'touchstart' ? e.touches[0].pageX : e.pageX;
            const pageY = e.type === 'touchstart' ? e.touches[0].pageY : e.pageY;
            startX = pageX - currentTranslateX;
            startY = pageY - currentTranslateY;
        }
    }

    function handleMove(e) {
        if (cameraStage.classList.contains('is-transitioning') || welcomePopup.classList.contains('is-show')) return;

        if (e.type === 'touchmove' && e.touches.length >= 2 && isPinching) {
            const currentDist = getTouchDistance(e.touches);
            const factor = currentDist / startTouchDist;
            currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale * factor));
            updateStageTransform();
        } else if (isDragging && !isPinching) {
            const pageX = e.type === 'touchmove' ? e.touches[0].pageX : e.pageX;
            const pageY = e.type === 'touchmove' ? e.touches[0].pageY : e.pageY;
            translateX = pageX - startX;
            translateY = pageY - startY;
            updateStageTransform();
        }
    }

    function handleEnd(e) {
        cameraStage.classList.remove('is-dragging');
        if (isPinching) {
            if (e.touches && e.touches.length < 2) {
                isPinching = false;
                isDragging = false; 
                currentTranslateX = translateX;
                currentTranslateY = translateY;
            }
        } else if (isDragging) {
            isDragging = false;
            currentTranslateX = translateX;
            currentTranslateY = translateY;
        }
    }

    function updateStageTransform() {
        const rect = cameraStage.getBoundingClientRect();
        const maxPanX = Math.max(0, (rect.width / currentScale - window.innerWidth) / 2);
        const maxPanY = Math.max(0, (rect.height / currentScale - window.innerHeight) / 2);

        translateX = Math.max(-maxPanX, Math.min(maxPanX, translateX));
        translateY = Math.max(-maxPanY, Math.min(maxPanY, translateY));

        cameraStage.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
    }

    function initPanAndPinchControls() {
        cameraStage.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        cameraStage.addEventListener('touchstart', handleStart, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    }

    function disablePanAndPinchControls() {
        cameraStage.removeEventListener('mousedown', handleStart);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        cameraStage.removeEventListener('touchstart', handleStart);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
    }

    function isPureClick() {
        const duration = Date.now() - touchStartTime;
        const moveDistanceX = Math.abs(translateX - currentTranslateX);
        const moveDistanceY = Math.abs(translateY - currentTranslateY);
        return !isPinching && duration < 200 && moveDistanceX < 6 && moveDistanceY < 6;
    }

    // --- 各遷移リンクイベント ---
    document.querySelectorAll('.overlay-link').forEach(link => {
        if (link.id === 'lnk-greeting') return; // ご挨拶リンクだけはズーム遷移ロジックから除外
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetX = link.getAttribute('data-target-x');
            const targetY = link.getAttribute('data-target-y');
            
            let url = 'index.html';
            if(link.id === 'lnk-menu') url = 'menu.html';
            if(link.id === 'lnk-about') url = 'about.html';
            // 【追加】LINKSが押された時の遷移先を指定
            if(link.id === 'lnk-links') url = 'links.html';

            zoomIntoElement(targetX, targetY, url);
        });
    });

    document.getElementById('area-bakery').addEventListener('click', (e) => {
        if (!isPureClick() || welcomePopup.classList.contains('is-show')) return; 
        e.preventDefault();
        zoomIntoElement('85%', '50%', 'menu.html');
    });

    document.getElementById('area-record').addEventListener('click', (e) => {
        if (!isPureClick() || welcomePopup.classList.contains('is-show')) return;
        e.preventDefault();
        zoomIntoElement('46%', '30%', 'about.html');
    });
});