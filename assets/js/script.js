const siteHeader = document.getElementById('siteHeader');
const modal = document.getElementById('portfolioModal');
const modalDialog = modal.querySelector('.modal-dialog');
const modalHeroMedia = document.getElementById('modalHeroMedia');
const modalThumbs = document.getElementById('modalThumbs');
const modalDynamicBody = document.getElementById('modalDynamicBody');
const modalClose = modal.querySelector('.modal-close');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
const modalPageIndicator = document.getElementById('modalPageIndicator');

const modalTemplates = {
  poster: document.getElementById('modalTemplatePoster'),
  banner: document.getElementById('modalTemplateBanner'),
  cardnews: document.getElementById('modalTemplateCardnews'),
  reels: document.getElementById('modalTemplateReels'),
  edit: document.getElementById('modalTemplateEdit'),
  default: document.getElementById('modalTemplateDefault')
};

let lastFocusedElement = null;
let currentModalImages = [];
let currentModalTitle = 'Project Title';
let currentModalIndex = 0;
let modalTouchStartX = 0;
let modalTouchDeltaX = 0;

function getCardPrimaryMedia(source) {
  const imageEl = source.querySelector('img');
  if (imageEl?.getAttribute('src')) {
    return imageEl.getAttribute('src');
  }

  const sourceEl = source.querySelector('video source');
  if (sourceEl?.getAttribute('src')) {
    return sourceEl.getAttribute('src');
  }

  const videoEl = source.querySelector('video');
  if (videoEl?.getAttribute('src')) {
    return videoEl.getAttribute('src');
  }

  return '';
}

function isVideoFile(src) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(src || '');
}

function createMediaMarkup(src, alt) {
  if (!src) return alt || 'Preview';

  if (isVideoFile(src)) {
    return `
          <video autoplay muted loop playsinline preload="metadata" aria-label="${alt}">
            <source src="${src}">
          </video>
        `;
  }

  return `<img src="${src}" alt="${alt}">`;
}

// poster / banner는 data-modal-media 속성으로 썸네일과 다른 모달 전용 이미지를 지정할 수 있습니다.
function getCardData(source) {
  return {
    type: source.dataset.modalType || 'default',
    title: source.dataset.modalTitle || 'Project Title',
    description: source.dataset.modalDescription || 'Project description',
    role: source.dataset.modalRole || 'Role information',
    tools: source.dataset.modalTools || 'Tool information',
    summary: source.dataset.modalSummary || source.dataset.modalDescription || 'Summary text',
    meta1Label: source.dataset.modalMeta1Label || 'Info 01',
    meta1Value: source.dataset.modalMeta1Value || '-',
    meta2Label: source.dataset.modalMeta2Label || 'Info 02',
    meta2Value: source.dataset.modalMeta2Value || '-',
    meta3Label: source.dataset.modalMeta3Label || 'Info 03',
    meta3Value: source.dataset.modalMeta3Value || '-',
    meta4Label: source.dataset.modalMeta4Label || 'Info 04',
    meta4Value: source.dataset.modalMeta4Value || '-',
    noteTitle: source.dataset.modalNoteTitle || 'Editable Note',
    note: source.dataset.modalNote || 'Write any note here.',
    tags: (source.dataset.modalTags || '').split(',').map(tag => tag.trim()).filter(Boolean),
    link: source.dataset.modalLink || '#',
    subLink: source.dataset.modalSublink || '#',
    images: (source.dataset.modalImages || '').split('|').map(item => item.trim()).filter(Boolean),
    ratio: source.dataset.modalRatio || '',
    modalMedia: source.dataset.modalMedia || '',
    badgeLabel: source.dataset.modalLabel || ({
      poster: 'Poster Project',
      banner: 'Banner Project',
      cardnews: 'Card News Project',
      reels: 'Reels · Video Project',
      edit: 'Video Edit Project',
      default: 'Project Detail'
    }[source.dataset.modalType || 'default'] || 'Project Detail'),
    primaryMedia: getCardPrimaryMedia(source)
  };
}

function fillTemplateFields(container, data) {
  container.querySelectorAll('[data-field]').forEach((node) => {
    const key = node.dataset.field;
    node.textContent = data[key] || '';
  });

  container.querySelectorAll('[data-list="tags"]').forEach((list) => {
    list.innerHTML = '';
    if (!data.tags.length) {
      const emptyTag = document.createElement('span');
      emptyTag.className = 'modal-tag';
      emptyTag.textContent = 'No tags';
      list.appendChild(emptyTag);
      return;
    }

    data.tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'modal-tag';
      chip.textContent = tag;
      list.appendChild(chip);
    });
  });

  const mainLink = container.querySelector('#modalLink');
  if (mainLink) {
    mainLink.href = data.link;
    mainLink.classList.toggle('is-hidden', data.link === '#');
  }

  const subLink = container.querySelector('#modalSubLink');
  if (subLink) {
    subLink.href = data.subLink;
    subLink.classList.toggle('is-hidden', data.subLink === '#');
  }
}

function setModalGalleryMode(type, totalImages) {
  const isMultiPageCardNews = type === 'cardnews' && totalImages > 1;

  modalThumbs.classList.toggle('is-hidden', !isMultiPageCardNews);
  modalPrev.classList.toggle('is-hidden', !isMultiPageCardNews);
  modalNext.classList.toggle('is-hidden', !isMultiPageCardNews);
  modalPageIndicator.classList.toggle('is-hidden', !isMultiPageCardNews);
}




function setModalTypeClass(type) {
  modalDialog.classList.remove(
    'modal-type-poster',
    'modal-type-banner',
    'modal-type-cardnews',
    'modal-type-reels',
    'modal-type-edit',
    'modal-type-default'
  );

  const normalized = [
    'poster',
    'banner',
    'cardnews',
    'reels',
    'edit'
  ].includes(type)
    ? type
    : 'default';

  modalDialog.classList.add(`modal-type-${normalized}`);
}

function setModalMediaRatio(ratio, type) {
  const fallbackRatios = {
    poster: '3 / 4',
    banner: '16 / 9',
    cardnews: '1 / 1',
    reels: '9 / 16',
    edit: '16 / 9',
    default: '5 / 3'
  };

  const normalizedType = [
    'poster',
    'banner',
    'cardnews',
    'reels',
    'edit'
  ].includes(type)
    ? type
    : 'default';

  const finalRatio =
    ratio && ratio.trim()
      ? ratio.trim()
      : fallbackRatios[normalizedType];

  modalDialog.style.setProperty('--modal-media-ratio', finalRatio);
  modalHeroMedia.style.aspectRatio = finalRatio;
}

function renderModalBody(data) {
  const template = modalTemplates[data.type] || modalTemplates.default;
  const fragment = template.content.cloneNode(true);
  const wrapper = document.createElement('div');
  wrapper.className = 'modal-dynamic-body';
  wrapper.appendChild(fragment);
  fillTemplateFields(wrapper, data);
  modalDynamicBody.replaceChildren(wrapper);
}

function updateModalThumbActiveState() {
  modalThumbs.querySelectorAll('.modal-thumb').forEach((thumb, index) => {
    thumb.classList.toggle('is-active', index === currentModalIndex);
  });
}

function updateModalControls() {
  const total = currentModalImages.length;

  if (!total) {
    modalPrev.disabled = true;
    modalNext.disabled = true;
    modalPageIndicator.textContent = '0 / 0';
    return;
  }

  modalPrev.disabled = currentModalIndex <= 0;
  modalNext.disabled = currentModalIndex >= total - 1;
  modalPageIndicator.textContent = `${currentModalIndex + 1} / ${total}`;
}

function renderModalHeroByIndex(index) {
  if (!currentModalImages.length) {
    modalHeroMedia.classList.remove('is-swipe-ready');
    modalHeroMedia.textContent = currentModalTitle;
    updateModalControls();
    return;
  }

  currentModalIndex = Math.max(0, Math.min(index, currentModalImages.length - 1));
  modalHeroMedia.classList.add('is-swipe-ready');
  modalHeroMedia.innerHTML = createMediaMarkup(
    currentModalImages[currentModalIndex],
    `${currentModalTitle} ${currentModalIndex + 1}`
  );
  updateModalThumbActiveState();
  updateModalControls();
}

function goToModalSlide(index) {
  renderModalHeroByIndex(index);
}

function stepModalSlide(direction) {
  const nextIndex = currentModalIndex + direction;
  if (nextIndex < 0 || nextIndex >= currentModalImages.length) return;
  goToModalSlide(nextIndex);
}

function renderModalThumbs(images, title) {
  modalThumbs.innerHTML = '';

  if (!images.length) {
    modalThumbs.innerHTML = '';
    updateModalControls();
    return;
  }

  images.forEach((imageSrc, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modal-thumb';
    button.innerHTML = createMediaMarkup(imageSrc, `${title} ${index + 1}`);
    button.addEventListener('click', () => {
      goToModalSlide(index);
    });
    modalThumbs.appendChild(button);
  });

  updateModalThumbActiveState();
  updateModalControls();
}

function openModal(source) {
  const parentTrack = source.closest('.slider-track');
  if (parentTrack && parentTrack._dragState?.suppressClick) return;

  const data = getCardData(source);

  currentModalTitle = data.title;
  currentModalImages = [...data.images];

  if (
    data.type === 'poster' ||
    data.type === 'banner' ||
    data.type === 'reels' ||
    data.type === 'edit'
  ) {
    if (data.modalMedia) {
      currentModalImages = [data.modalMedia];
    } else if (!currentModalImages.length && data.primaryMedia) {
      currentModalImages = [data.primaryMedia];
    }
  }

  currentModalIndex = 0;
  lastFocusedElement = source;

  setModalTypeClass(data.type);
  setModalMediaRatio(data.ratio, data.type);
  renderModalBody(data);
  renderModalThumbs(currentModalImages, data.title);
  setModalGalleryMode(data.type, currentModalImages.length);
  renderModalHeroByIndex(0);

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalClose.focus();
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  modalDialog.classList.remove(
    'modal-type-poster',
    'modal-type-banner',
    'modal-type-cardnews',
    'modal-type-reels',
    'modal-type-edit',
    'modal-type-default'
  );
  modalDialog.style.removeProperty('--modal-media-ratio');
  modalHeroMedia.style.removeProperty('aspect-ratio');
  if (lastFocusedElement) lastFocusedElement.focus();
}

const setHeaderState = () => {
  if (window.scrollY > 20) siteHeader.classList.add('scrolled');
  else siteHeader.classList.remove('scrolled');
};

setHeaderState();
window.addEventListener('scroll', setHeaderState);

const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => revealObserver.observe(item));

function getStepSize(track) {
  const firstItem = track.firstElementChild;
  if (!firstItem) return Math.max(track.clientWidth * 0.85, 320);

  const trackStyle = window.getComputedStyle(track);
  const itemWidth = firstItem.getBoundingClientRect().width;
  const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '0') || 0;

  return itemWidth + gap;
}

function scrollSlider(track, direction = 1) {
  const step = getStepSize(track);
  track.scrollBy({
    left: step * direction,
    behavior: 'smooth'
  });
}

document.querySelectorAll('[data-slider-prev], [data-slider-next]').forEach((button) => {
  button.addEventListener('click', () => {
    const trackId = button.dataset.sliderPrev || button.dataset.sliderNext;
    const track = document.getElementById(trackId);
    if (!track) return;

    const direction = button.hasAttribute('data-slider-next') ? 1 : -1;
    scrollSlider(track, direction);
  });
});

function enableDragScroll(track) {
  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let hasDragged = false;
  let suppressClick = false;

  const threshold = 8;

  track.querySelectorAll('.thumb-card').forEach((card) => {
    card.setAttribute('draggable', 'false');
  });

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    suppressClick = false;
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add('dragging');
  };

  const onMouseMove = (e) => {
    if (!isDown) return;

    const dx = e.clientX - startX;

    if (Math.abs(dx) > threshold) {
      hasDragged = true;
      suppressClick = true;
    }

    if (hasDragged) {
      track.scrollLeft = startScrollLeft - dx;
    }
  };

  const onMouseUp = () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');

    if (hasDragged) {
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
  };

  const onMouseLeave = () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('dragging');
  };

  track.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  track.addEventListener('mouseleave', onMouseLeave);

  track.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  track.addEventListener('click', (e) => {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  track._dragState = {
    get suppressClick() {
      return suppressClick;
    }
  };
}

document.querySelectorAll('.slider-track').forEach(enableDragScroll);

document.querySelectorAll('.modal-card').forEach((card) => {
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');

  card.addEventListener('click', () => openModal(card));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(card);
    }
  });
});

modalPrev.addEventListener('click', () => stepModalSlide(-1));
modalNext.addEventListener('click', () => stepModalSlide(1));

modalHeroMedia.addEventListener('touchstart', (event) => {
  if (currentModalImages.length <= 1) return;
  modalTouchStartX = event.touches[0].clientX;
  modalTouchDeltaX = 0;
}, { passive: true });

modalHeroMedia.addEventListener('touchmove', (event) => {
  if (currentModalImages.length <= 1) return;
  modalTouchDeltaX = event.touches[0].clientX - modalTouchStartX;
}, { passive: true });

modalHeroMedia.addEventListener('touchend', () => {
  if (currentModalImages.length <= 1) return;
  const swipeThreshold = 50;

  if (modalTouchDeltaX <= -swipeThreshold) {
    stepModalSlide(1);
  } else if (modalTouchDeltaX >= swipeThreshold) {
    stepModalSlide(-1);
  }

  modalTouchStartX = 0;
  modalTouchDeltaX = 0;
}, { passive: true });

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

window.addEventListener('keydown', (event) => {
  if (!modal.classList.contains('is-open')) return;

  if (event.key === 'Escape') {
    closeModal();
  } else if (event.key === 'ArrowLeft') {
    stepModalSlide(-1);
  } else if (event.key === 'ArrowRight') {
    stepModalSlide(1);
  }
});

/* =========================================================
   NAVIGATION SCROLL
========================================================= */

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    const targetId = link.getAttribute('href');
    const target = document.querySelector(targetId);

    if (!target) return;

    /* 메뉴 이동 중 sticky 잠시 해제 */
    document.body.classList.add('nav-scrolling');

    /* 변경된 레이아웃이 반영된 뒤 위치 계산 */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetTop =
          target.getBoundingClientRect().top +
          window.scrollY -
          74;

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth'
        });

        /* 이동 후 sticky 다시 활성화 */
        setTimeout(() => {
          document.body.classList.remove('nav-scrolling');
          updateStackPanels();
        }, 1400);
      });
    });
  });
});

/* =========================================================
   VIDEO HOVER PLAY
========================================================= */

const videoCards = document.querySelectorAll(
  '#videoTrack .thumb-card, #videoEditTrack .thumb-card'
);

console.log('찾은 영상 카드 수:', videoCards.length);

videoCards.forEach((card) => {
  const video = card.querySelector('video');

  if (!video) return;

  video.muted = true;

  card.addEventListener('mouseenter', () => {
    card.classList.add('is-playing');

    video.play().catch((error) => {
      console.error('영상 재생 오류:', video.currentSrc, error);
    });
  });

  card.addEventListener('mouseleave', () => {
    video.pause();
    card.classList.remove('is-playing');
  });
});

/* ===================================
   LONG SECTION STICKY STACK
=================================== */

const stackPanels = document.querySelectorAll(".stack-panel");

function updateStackPanels() {
  stackPanels.forEach((panel) => {
    const panelHeight = panel.offsetHeight;
    const viewportHeight = window.innerHeight;

    /*
      화면보다 긴 섹션:
      내용은 정상적으로 스크롤되다가
      마지막 부분이 화면에 도착하면 고정

      화면보다 짧은 섹션:
      top: 0에서 고정
    */

    const stickyTop = Math.min(
      0,
      viewportHeight - panelHeight
    );

    panel.style.setProperty(
      "--stack-top",
      `${stickyTop}px`
    );
  });
}


/* 페이지 로드 후 계산 */

window.addEventListener("load", updateStackPanels);


/* 브라우저 크기 변경 시 다시 계산 */

window.addEventListener("resize", updateStackPanels);


/* 이미지나 콘텐츠 높이 변경 감지 */

const stackResizeObserver = new ResizeObserver(() => {
  updateStackPanels();
});

stackPanels.forEach((panel) => {
  stackResizeObserver.observe(panel);
});

/* =========================================================
   VISUAL CONTENTS HOVER AUTO SCROLL
========================================================= */

function enableHoverAutoScroll(track) {
  let scrollSpeed = 0;
  let animationFrame = null;
  let isHovering = false;

  const SCROLL_SPEED = 3;

  function updateScrollSpeed(event) {
    const rect = track.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const position = mouseX / rect.width;

    /* 왼쪽 35% */
    if (position < 0.35) {
      scrollSpeed = -SCROLL_SPEED;
    }

    /* 오른쪽 35% */
    else if (position > 0.65) {
      scrollSpeed = SCROLL_SPEED;
    }

    /* 가운데 30% */
    else {
      scrollSpeed = 0;
    }
  }

  function runAutoScroll() {
    if (!isHovering) {
      animationFrame = null;
      return;
    }

    /* 드래그 중에는 자동 이동 잠시 정지 */
    if (!track.classList.contains('dragging')) {
      track.scrollLeft += scrollSpeed;
    }

    animationFrame = requestAnimationFrame(runAutoScroll);
  }

  track.addEventListener('mouseenter', (event) => {
    isHovering = true;

    /* 들어온 순간 바로 마우스 위치 계산 */
    updateScrollSpeed(event);

    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(runAutoScroll);
    }
  });

  track.addEventListener('mousemove', updateScrollSpeed);

  track.addEventListener('mouseleave', () => {
    isHovering = false;
    scrollSpeed = 0;

    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  });
}


/* 세 개 영역 전부 적용 */
document
  .querySelectorAll(
    '#visualTrack, #videoTrack, #videoEditTrack'
  )
  .forEach(enableHoverAutoScroll);



/* =====================================
 TOP BUTTON
===================================== */

const topButton = document.getElementById("topButton");

if (topButton) {
  window.addEventListener("scroll", function () {
    if (window.scrollY > 500) {
      topButton.classList.add("is-visible");
    } else {
      topButton.classList.remove("is-visible");
    }
  });

  topButton.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* =====================================
   CURSOR FOLLOWER
===================================== */

const cursorFollower = document.getElementById("cursorFollower");

if (cursorFollower) {
  let mouseX = 0;
  let mouseY = 0;

  let followerX = 0;
  let followerY = 0;

  const offsetX = 13;
  const offsetY = 13;

  window.addEventListener("mousemove", function (event) {
    mouseX = event.clientX + offsetX;
    mouseY = event.clientY + offsetY;

    cursorFollower.classList.add("is-visible");
  });

  function moveCursorFollower() {
    followerX += (mouseX - followerX) * 0.18;
    followerY += (mouseY - followerY) * 0.18;

    cursorFollower.style.transform =
      `translate3d(${followerX}px, ${followerY}px, 0)`;

    requestAnimationFrame(moveCursorFollower);
  }

  moveCursorFollower();


  /* 링크, 버튼, 카드 위에서는 살짝 커짐 */
  document.addEventListener("mouseover", function (event) {
    if (event.target.closest("a, button, .thumb-card")) {
      cursorFollower.classList.add("is-hovering");
    }
  });

  document.addEventListener("mouseout", function (event) {
    if (event.target.closest("a, button, .thumb-card")) {
      cursorFollower.classList.remove("is-hovering");
    }
  });
}


/* =====================================
   INTRO VIDEO AUTOPLAY
===================================== */

document.addEventListener("DOMContentLoaded", function () {
  const heroVideo = document.querySelector(".hero-video");

  if (!heroVideo) {
    return;
  }

  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;
  heroVideo.setAttribute("muted", "");
  heroVideo.setAttribute("playsinline", "");
  heroVideo.setAttribute("webkit-playsinline", "");

  function playHeroVideo() {
    const playPromise = heroVideo.play();

    if (playPromise !== undefined) {
      playPromise.catch(function () {
        // 모바일 브라우저가 자동재생을 막는 경우
      });
    }
  }

  playHeroVideo();

  window.addEventListener("pageshow", playHeroVideo);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      playHeroVideo();
    }
  });

  document.addEventListener(
    "touchstart",
    function () {
      playHeroVideo();
    },
    { once: true }
  );
});
