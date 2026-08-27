/*!
 * EasyZoom (Vanilla JS)
 * High-performance, zero-dependency image zoom for Shopify
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EasyZoom = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const defaultOptions = {
    loadingNotice: 'Loading image',
    errorNotice: 'The image could not be loaded',
    preventClicks: true,
    zoomScale: 2.0,
    overlay: true,
    onShow: null,
    onHide: null,
    onMove: null
  };

  function EasyZoom(target, options) {
    this.target = target;
    this.opts = Object.assign({}, defaultOptions, options);
    this.isOpen = false;
    this.isReady = false;
    this.isLoading = false;
    this.zoomImg = null;
    this.flyout = null;

    this.init();
  }

  EasyZoom.prototype.init = function () {
    const self = this;
    const target = this.target;

    this.link = target.querySelector('a') || target;
    this.sourceImg = target.querySelector('img.product-media__image') || target.querySelector('img');

    if (!this.sourceImg) return;

    this.zoomSrc = this.link.getAttribute('href') 
      || this.sourceImg.getAttribute('data-max-resolution')
      || this.sourceImg.getAttribute('data-zoom-src')
      || this.sourceImg.currentSrc 
      || this.sourceImg.src;

    if (!this.zoomSrc || this.zoomSrc.startsWith('#') || this.zoomSrc.startsWith('javascript:')) {
      this.zoomSrc = this.sourceImg.getAttribute('data-max-resolution') || this.sourceImg.currentSrc || this.sourceImg.src;
    }

    let ticking = false;
    let latestEvent = null;

    this._onMouseEnter = function (e) {
      self.show(e);
    };

    this._onMouseMove = function (e) {
      if (!self.isOpen) return;
      latestEvent = e;
      if (!ticking) {
        requestAnimationFrame(function () {
          if (self.isOpen && latestEvent) {
            self.move(latestEvent);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    this._onMouseLeave = function () {
      self.hide();
    };

    this._onClick = function (e) {
      if (self.opts.preventClicks) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    target.addEventListener('mouseenter', this._onMouseEnter);
    target.addEventListener('mousemove', this._onMouseMove);
    target.addEventListener('mouseleave', this._onMouseLeave);
    target.addEventListener('click', this._onClick);

    target.classList.add('easyzoom-initialized');
  };

  EasyZoom.prototype.show = function (e) {
    if (this.isOpen) return;

    const self = this;
    const target = this.target;

    if (!this.flyout) {
      this.flyout = document.createElement('div');
      this.flyout.className = 'easyzoom-flyout';
      this.flyout.style.position = 'absolute';
      this.flyout.style.top = '0';
      this.flyout.style.left = '0';
      this.flyout.style.width = '100%';
      this.flyout.style.height = '100%';
      this.flyout.style.overflow = 'hidden';
      this.flyout.style.pointerEvents = 'none';
      this.flyout.style.zIndex = '50';
      this.flyout.style.backgroundColor = 'var(--color-background, #fff)';
    }

    if (!this.zoomImg) {
      target.classList.add('is-loading');
      this.isLoading = true;

      const img = new Image();
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.willChange = 'transform, transform-origin';
      img.style.transition = 'transform 0.1s ease-out';

      img.onload = function () {
        self.isLoading = false;
        self.isReady = true;
        target.classList.remove('is-loading');
        target.classList.add('is-ready');

        if (self.isOpen) {
          if (!self.flyout.contains(img)) {
            self.flyout.appendChild(img);
          }
          if (!target.contains(self.flyout)) {
            target.appendChild(self.flyout);
          }
          if (e) self.move(e);
        }
      };

      img.onerror = function () {
        self.isLoading = false;
        target.classList.remove('is-loading');
        target.classList.add('is-error');
      };

      img.src = this.zoomSrc;
      this.zoomImg = img;
    } else if (this.isReady) {
      if (!this.flyout.contains(this.zoomImg)) {
        this.flyout.appendChild(this.zoomImg);
      }
      if (!target.contains(this.flyout)) {
        target.appendChild(this.flyout);
      }
    }

    this.isOpen = true;
    if (e && this.isReady) {
      this.move(e);
    }

    if (typeof this.opts.onShow === 'function') {
      this.opts.onShow.call(this);
    }
  };

  EasyZoom.prototype.move = function (e) {
    if (!this.zoomImg || !this.isReady) return;

    const targetRect = this.target.getBoundingClientRect();
    if (targetRect.width === 0 || targetRect.height === 0) return;

    const xPercent = Math.max(0, Math.min(100, ((e.clientX - targetRect.left) / targetRect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - targetRect.top) / targetRect.height) * 100));

    this.zoomImg.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    this.zoomImg.style.transform = `scale(${this.opts.zoomScale})`;

    if (typeof this.opts.onMove === 'function') {
      this.opts.onMove.call(this, e);
    }
  };

  EasyZoom.prototype.hide = function () {
    this.isOpen = false;
    if (this.flyout && this.flyout.parentNode) {
      this.flyout.parentNode.removeChild(this.flyout);
    }
    if (typeof this.opts.onHide === 'function') {
      this.opts.onHide.call(this);
    }
  };

  EasyZoom.prototype.teardown = function () {
    this.hide();
    this.target.removeEventListener('mouseenter', this._onMouseEnter);
    this.target.removeEventListener('mousemove', this._onMouseMove);
    this.target.removeEventListener('mouseleave', this._onMouseLeave);
    this.target.removeEventListener('click', this._onClick);
    this.target.classList.remove('easyzoom-initialized', 'is-ready', 'is-loading', 'is-error');
  };

  function initEasyZoomInstances() {
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
    const galleries = document.querySelectorAll('media-gallery[data-zoom-easyzoom], [data-zoom-easyzoom]');
    galleries.forEach((gallery) => {
      const scale = parseFloat(gallery.dataset.zoomScale) || 2.0;
      const targets = gallery.querySelectorAll('.product-media-container--easyzoom, .custom-media-gallery__main-item, .product-media-container--slide');
      targets.forEach((el) => {
        if (el.easyZoomInstance) {
          el.easyZoomInstance.teardown();
        }
        el.easyZoomInstance = new EasyZoom(el, { zoomScale: scale, preventClicks: true });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEasyZoomInstances);
  } else {
    initEasyZoomInstances();
  }

  document.addEventListener('product:easyzoom-reinit', initEasyZoomInstances);
  document.addEventListener('product:custom-zoom-reinit', initEasyZoomInstances);
  document.addEventListener('shopify:section:load', initEasyZoomInstances);

  return EasyZoom;
});
