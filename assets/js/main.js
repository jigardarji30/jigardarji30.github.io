  // Sticky navbar effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const setMenu = (open) => {
    navLinks.classList.toggle('open', open);
    mobileToggle.setAttribute('aria-expanded', String(open));
  };

  mobileToggle.addEventListener('click', () => {
    setMenu(!navLinks.classList.contains('open'));
  });

  // Close mobile menu when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
  });

  // Scroll reveal animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Reviews slider. The track is a native scroll-snap container, so this only
  // layers on arrows and dots. Scrolling and swiping work without any of it.
  {
  const track = document.getElementById('reviewsTrack');
  const controls = document.getElementById('reviewControls');
  const dotsBox = document.getElementById('reviewDots');

  if (track && controls && dotsBox) {
    // Read children on every call rather than caching, so adding or removing
    // review cards in the markup needs no JS change.
    const getCards = () => Array.from(track.children);

    // How many cards fit in one view, derived from measured widths so it
    // stays correct at every breakpoint without duplicating the media queries.
    const perView = () => {
      const cards = getCards();
      if (!cards.length) return 1;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const card = cards[0].getBoundingClientRect().width;
      return Math.max(1, Math.round((track.clientWidth + gap) / (card + gap)));
    };

    // The scroll offset each page starts at, clamped to how far the track can
    // actually scroll. This matters when the card count isn't a multiple of
    // perView: with 4 cards at 3-per-view, page 2 "wants" offset 1176 but the
    // track maxes out at 392, so assuming even multiples desyncs the dots and
    // strands the arrows. Duplicates are dropped so there are no dead dots.
    const pageOffsets = () => {
      const cards = getCards();
      const per = perView();
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const offsets = [];
      for (let i = 0; i < cards.length; i += per) {
        const offset = Math.min(cards[i].offsetLeft - track.offsetLeft, max);
        if (!offsets.length || Math.abs(offsets[offsets.length - 1] - offset) > 1) {
          offsets.push(offset);
        }
      }
      return offsets.length ? offsets : [0];
    };

    const pageCount = () => pageOffsets().length;

    // Nearest page to where the track actually sits, so swiping and dragging
    // keep the dots honest too.
    const currentPage = () => {
      const offsets = pageOffsets();
      let best = 0;
      let bestDistance = Infinity;
      offsets.forEach((offset, i) => {
        const distance = Math.abs(offset - track.scrollLeft);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      return best;
    };

    const goTo = (page) => {
      const offsets = pageOffsets();
      const clamped = Math.max(0, Math.min(page, offsets.length - 1));
      track.scrollLeft = offsets[clamped];
      // Sync controls immediately rather than waiting on the scroll event,
      // smooth scrolling can be interrupted, and the event can be missed.
      activePage = clamped;
      render();
    };

    // Set by goTo() so button/dot navigation doesn't depend on the scroll event;
    // null means "derive it from scroll position" (user swiped or dragged).
    let activePage = null;

    const render = () => {
      const pages = pageCount();
      const active = Math.min(
        activePage === null ? currentPage() : activePage,
        pages - 1
      );
      activePage = null;

      // Rebuild dots only when the count changes (e.g. on resize)
      if (dotsBox.children.length !== pages) {
        dotsBox.innerHTML = '';
        for (let i = 0; i < pages; i++) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'slider-dot';
          dot.setAttribute('aria-label', 'Go to review page ' + (i + 1));
          dot.addEventListener('click', () => goTo(i));
          dotsBox.appendChild(dot);
        }
      }
      Array.from(dotsBox.children).forEach((dot, i) => {
        dot.setAttribute('aria-current', String(i === active));
      });

      controls.querySelectorAll('.slider-btn').forEach((btn) => {
        const dir = Number(btn.dataset.dir);
        btn.disabled = dir < 0 ? active === 0 : active >= pages - 1;
      });

      // A single page means nothing to page through
      controls.style.display = pages > 1 ? '' : 'none';
    };

    controls.querySelectorAll('.slider-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        goTo(currentPage() + Number(btn.dataset.dir));
      });
    });

    // render() is a handful of attribute writes, so call it straight from the
    // scroll handler. Coalescing through requestAnimationFrame bought nothing
    // measurable here and made the control state depend on frame timing.
    track.addEventListener('scroll', render, { passive: true });
    window.addEventListener('resize', render);
    render();
  }
  }

  // Contact form. Submits over fetch so the visitor stays on the page.
  // Without JS the form still POSTs natively to Web3Forms, so it never dead-ends.
  // Scoped in a block so these generic names can't collide with any script
  // added later (analytics snippets and the like).
  {
  const form = document.getElementById('contactForm');
  if (form) {
    const status = document.getElementById('formStatus');
    const submit = form.querySelector('.form-submit');
    const FALLBACK = 'Something went wrong sending that. Please email me directly at ' +
      '<a href="mailto:jigar.webexpert@gmail.com">jigar.webexpert@gmail.com</a>.';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.className = 'form-status';
      status.textContent = '';

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const label = submit.innerHTML;
      submit.disabled = true;
      submit.textContent = 'Sending…';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        const result = await response.json().catch(() => ({}));

        if (response.ok && result.success !== false) {
          form.reset();
          status.className = 'form-status is-ok';
          status.textContent = "Thanks, that's in my inbox. I'll reply within 24 hours.";
        } else {
          throw new Error(result.message || 'Submission rejected');
        }
      } catch (err) {
        status.className = 'form-status is-err';
        status.innerHTML = FALLBACK;
      } finally {
        submit.disabled = false;
        submit.innerHTML = label;
      }
    });
  }
  }
