class HeaderComponent extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.resizeObserver.observe(this);
    this.stickyMode = this.getAttribute("data-sticky-type");
    this.offscreen = false;

    this.menuDrawerHiddenWidth = null;
    this.intersectionObserver = null;
    this.lastScrollTop = 0;

    this.timeout = null;
    this.animationDelay = 150;
    // this.setHeaderHeight();

    if (this.stickyMode) {
      this.observeStickyPosition(this.stickyMode === "always");

      if (this.stickyMode === "scroll-up" || this.stickyMode === "always") {
        // document.addEventListener("scroll", this.handleWindowScroll.bind(this));
        document.addEventListener("scroll", theme.utils.rafThrottle(this.handleWindowScroll.bind(this)));
      }
    }
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener("scroll", this.handleWindowScroll.bind(this));
    document.body.style.setProperty("--header-height", "0px");
  }

  // setHeaderHeight() {
  //   const { height } = this.getBoundingClientRect();
  //   document.body.style.setProperty('--header-height', `${height}px`);

  // }

  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return;
    cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = requestAnimationFrame(() => {
      const { height } = entry.target.getBoundingClientRect();
      document.body.style.setProperty("--header-height", `${height}px`);
    });
  });

  observeStickyPosition(alwaysSticky = true) {
    if (this.intersectionObserver) return;

    const config = {
      threshold: alwaysSticky ? 1 : 0,
    };

    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return;

      const { isIntersecting } = entry;

      if (!alwaysSticky) {
        this.offscreen =
          !isIntersecting || this.dataset.stickyState === "active";
      }
    }, config);

    this.intersectionObserver.observe(this);
  }

  handleWindowScroll() {
    if (!this.offscreen && this.stickyMode !== "always") return;

    const scrollTop = document.scrollingElement?.scrollTop ?? 0;
    const isScrollingUp = scrollTop < this.lastScrollTop;

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.stickyMode === "always") {
      const headerHeight = this.offsetHeight || 100;
      const announcementBarHeight = parseInt(document.documentElement.style.getPropertyValue('--announcement-bar-height')) || 0;
      const triggerHeight = headerHeight + announcementBarHeight;
      const isPastHeader = scrollTop > triggerHeight;

      if (!isPastHeader) {
        if (this.dataset.stickyState !== "inactive") this.dataset.stickyState = "inactive";
        if (scrollTop === 0) {
          if (this.dataset.scrollDirection !== "none") this.dataset.scrollDirection = "none";
        } else if (isScrollingUp) {
          if (this.dataset.scrollDirection !== "up") this.dataset.scrollDirection = "up";
        } else {
          if (this.dataset.scrollDirection !== "down") this.dataset.scrollDirection = "down";
        }
      } else {
        if (this.dataset.stickyState !== "active") this.dataset.stickyState = "active";
        if (isScrollingUp) {
          if (this.dataset.scrollDirection !== "up") this.dataset.scrollDirection = "up";
        } else {
          if (this.dataset.scrollDirection !== "down") this.dataset.scrollDirection = "down";
        }
      }

      this.lastScrollTop = scrollTop;
      return;
    }

    if (isScrollingUp) {
      if (this.hasAttribute("data-animating")) this.removeAttribute("data-animating");

      if (this.getBoundingClientRect().top >= 0) {
        // reset sticky state when header is scrolled up to natural position
        this.offscreen = false;
        if (this.dataset.stickyState !== "inactive") this.dataset.stickyState = "inactive";
        if (this.dataset.scrollDirection !== "none") this.dataset.scrollDirection = "none";
      } else {
        // show sticky header when scrolling up
        if (this.dataset.stickyState !== "active") this.dataset.stickyState = "active";
        if (this.dataset.scrollDirection !== "up") this.dataset.scrollDirection = "up";
      }
    } else if (this.dataset.stickyState === "active") {
      if (this.dataset.scrollDirection !== "none") this.dataset.scrollDirection = "none";
      // delay transitioning to idle hidden state for hiding animation
      if (!this.hasAttribute("data-animating")) this.setAttribute("data-animating", "");

      this.timeout = setTimeout(() => {
        if (this.dataset.stickyState !== "idle") this.dataset.stickyState = "idle";
        if (this.hasAttribute("data-animating")) this.removeAttribute("data-animating");
      }, this.animationDelay);
    } else {
      if (this.dataset.scrollDirection !== "none") this.dataset.scrollDirection = "none";
      if (this.dataset.stickyState !== "idle") this.dataset.stickyState = "idle";
    }

    this.lastScrollTop = scrollTop;
  }
}

if (!customElements.get("header-component"))
  customElements.define("header-component", HeaderComponent);

function calculateHeaderGroupHeight(
  header = document.querySelector('#header-component'),
  headerGroup = document.querySelector('#header-group')
) {
  if (!headerGroup) return 0;

  let totalHeight = 0;
  const children = headerGroup.children;

  for (let i = 0; i < children.length; i++) {
    const element = children[i];
    if (element === header || !(element instanceof HTMLElement)) continue;
    totalHeight += element.offsetHeight;
  }

  // If the header is transparent and has a sibling section, add the height of the header to the total height
  if (header instanceof HTMLElement && header.hasAttribute('transparent') && !header.parentElement?.nextElementSibling) {
    return totalHeight + header.offsetHeight;
  }

  return totalHeight;
}

function updateHeaderHeights() {
  const header = document.querySelector('header-component');

  // Early exit if no header - nothing to do
  if (!(header instanceof HTMLElement)) return;

  // Calculate initial height(s
  // const headerHeight = header.offsetHeight;
  const headerGroupHeight = calculateHeaderGroupHeight(header);

  // document.body.style.setProperty('--header-height', `${headerHeight}px`);
  document.body.style.setProperty('--header-group-height', `${headerGroupHeight}px`);
}

function setheaderRowHeight() {
  const headerMenu = document.querySelector('.header__row [data-main-menu]');
  if (!headerMenu) return;

  const { height } = headerMenu.closest('.header__row').getBoundingClientRect();
  document.body.style.setProperty('--header-row-menu-height', `${height}px`);
}

if (document.readyState === "complete") {
  setheaderRowHeight();
  updateHeaderHeights();
  setheaderRowHeight();
} else {
  window.addEventListener("load", () => {
    updateHeaderHeights();
    setheaderRowHeight();
  });
}