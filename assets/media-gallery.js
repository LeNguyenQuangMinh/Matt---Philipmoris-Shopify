if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        if (this.classList.contains('media-gallery--custom-layout')) {
          this.initCustomLayout();
        }
      }

      initCustomLayout() {
        if (this.dataset.customLayoutInitialized) return;
        this.dataset.customLayoutInitialized = 'true';

        const thumbBtns = Array.from(this.querySelectorAll('.custom-media-gallery__thumb-btn'));
        const mainItems = Array.from(this.querySelectorAll('.custom-media-gallery__main-item'));
        const prevBtn = this.querySelector('.custom-media-gallery__arrow--prev');
        const nextBtn = this.querySelector('.custom-media-gallery__arrow--next');
        const swiperEl = this.querySelector('.custom-media-gallery__swiper');

        let thumbSwiper = null;

        const initSwiperInstance = () => {
          if (!swiperEl || typeof Swiper === 'undefined') return;
          const isDesktop = window.innerWidth >= 768;

          if (thumbSwiper && typeof thumbSwiper.destroy === 'function') {
            thumbSwiper.destroy(true, true);
            thumbSwiper = null;
          }

          const swiperOptions = {
            direction: isDesktop ? 'vertical' : 'horizontal',
            slidesPerView: isDesktop ? 5 : 4,
            spaceBetween: 10,
            freeMode: false,
            watchSlidesProgress: true,
          };

          if (prevBtn && nextBtn) {
            swiperOptions.navigation = {
              prevEl: prevBtn,
              nextEl: nextBtn,
            };
          }

          thumbSwiper = new Swiper(swiperEl, swiperOptions);
        };

        initSwiperInstance();

        let resizeTimer;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (thumbSwiper) {
              const isDesktop = window.innerWidth >= 768;
              const currentDir = thumbSwiper.params.direction;
              if ((isDesktop && currentDir !== 'vertical') || (!isDesktop && currentDir !== 'horizontal')) {
                initSwiperInstance();
              }
            }
          }, 150);
        });

        const activateMedia = (btn) => {
          if (!btn) return;
          const targetId = btn.getAttribute('data-target-id');
          const targetItem = document.getElementById(targetId);
          
          mainItems.forEach((item) => item.classList.remove('active'));
          if (targetItem) {
            targetItem.classList.add('active');
            if (window.innerWidth >= 768) {
              targetItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }

          thumbBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          const index = thumbBtns.indexOf(btn);
          if (thumbSwiper && index >= 0) {
            thumbSwiper.slideTo(index);
          }
        };

        thumbBtns.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            activateMedia(btn);
          });
        });

        if ('IntersectionObserver' in window && mainItems.length > 0) {
          const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -50% 0px',
            threshold: 0
          };

          const observer = new IntersectionObserver((entries) => {
            if (window.innerWidth < 768) return;
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const mediaId = entry.target.getAttribute('data-media-id');
                const targetBtn = this.querySelector(`.custom-media-gallery__thumb-btn[data-media-id="${mediaId}"]`);
                if (targetBtn) {
                  thumbBtns.forEach((b) => b.classList.remove('active'));
                  targetBtn.classList.add('active');
                  const index = thumbBtns.indexOf(targetBtn);
                  if (thumbSwiper && index >= 0) {
                    thumbSwiper.slideTo(index);
                  }
                }
              }
            });
          }, observerOptions);

          mainItems.forEach((item) => observer.observe(item));
        }
      }

      setActiveMedia(mediaId, smooth = false) {
        if (!mediaId) return false;

        let cleanMediaId = mediaId;
        if (mediaId.indexOf('-') !== -1) {
          const parts = mediaId.split('-');
          cleanMediaId = parts[parts.length - 1];
        }

        if (this.classList.contains('media-gallery--custom-layout')) {
          const mainItems = Array.from(this.querySelectorAll('.custom-media-gallery__main-item'));
          const thumbBtns = Array.from(this.querySelectorAll('.custom-media-gallery__thumb-btn'));

          let targetMainItem = mainItems.find(item => item.getAttribute('data-media-id') === String(cleanMediaId));
          if (!targetMainItem) targetMainItem = mainItems[0];

          mainItems.forEach((item) => {
            if (item === targetMainItem) {
              item.classList.add('active');
              if (window.innerWidth >= 768) {
                item.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
              }
            } else {
              item.classList.remove('active');
            }
          });

          thumbBtns.forEach((b) => {
            if (b.getAttribute('data-media-id') === String(cleanMediaId)) {
              b.classList.add('active');
              try {
                b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } catch(e) {}
            } else {
              b.classList.remove('active');
            }
          });

          return true;
        }

        let element = this.querySelector(`[data-media-id="${cleanMediaId}"]`);
        
        if (!element) {
          element = this.querySelector(`[data-media-id="${mediaId}"]`);
        }

        if (!element) return false;

        this.querySelectorAll('[data-media-id].active').forEach((node) => node.classList.remove('active'));

        element.classList.add('active');

        const allMediaElements = Array.from(this.querySelectorAll('[data-media-id]'));
        const mediaIndex = allMediaElements.indexOf(element);

        this.syncSlideshow(element, mediaIndex, smooth);
        this.syncThumbnails(element, mediaIndex);

        if (this.classList.contains('media-gallery--grid')) {
          this.swapGridMedia(element, mediaIndex);
        }

        return true;
      }

      /**
       * Sync slideshow/swiper component when media is activated
       * @param {HTMLElement} mediaElement - The active media element
       * @param {number} mediaIndex - The index of the media in the gallery
       * @param {boolean} smooth - Whether to use smooth transition
       */
      syncSlideshow(mediaElement, mediaIndex, smooth = false) {
        try {
          if (!this.classList.contains('media-gallery--carousel')) return;

          const swiperComponent = this.querySelector('swiper-component');
          if (!swiperComponent) return;
          
          const waitForSwiper = (retries = 10) => {
            if (swiperComponent.initSwiper) {
              const slides = Array.from(swiperComponent.querySelectorAll('.swiper-wrapper .swiper-slide'));
              let slideIndex = mediaIndex;
              const slideElement = mediaElement.closest('.swiper-slide');
              if (slideElement) {
                const foundIndex = slides.indexOf(slideElement);
                if (foundIndex >= 0) {
                  slideIndex = foundIndex;
                }
              }

              if (slideIndex >= 0 && slideIndex < slides.length && swiperComponent.initSwiper) {
                swiperComponent.initSwiper.slideTo(slideIndex, smooth ? 800 : 0);
              }
            } else if (retries > 0) {
              setTimeout(() => waitForSwiper(retries - 1), 50);
            }
          };

          waitForSwiper();
        } catch (e) {
          try {
            if (this.slideshow && typeof this.slideshow.goTo === 'function') {
              this.slideshow.goTo(mediaIndex);
            }
          } catch (err) {
            // silent
          }
        }
      }

      /**
       * Sync thumbnails controls when media is activated
       * @param {HTMLElement} mediaElement - The active media element
       * @param {number} mediaIndex - The index of the media in the gallery
       */
      syncThumbnails(mediaElement, mediaIndex) {
        try {
          const thumbnailsContainer = this.querySelector('.swiper-controls__thumbnails-container');
          if (!thumbnailsContainer) return;

          const thumbnailButtons = Array.from(thumbnailsContainer.querySelectorAll('.swiper-controls__thumbnail[data-index]'));
          if (thumbnailButtons.length === 0) return;

          let slideIndex = mediaIndex;
          
          if (this.classList.contains('media-gallery--carousel')) {
            const swiperComponent = this.querySelector('swiper-component');
            if (swiperComponent) {
              const slideElement = mediaElement.closest('.swiper-slide');
              if (slideElement) {
                const slides = Array.from(swiperComponent.querySelectorAll('.swiper-wrapper .swiper-slide'));
                const foundIndex = slides.indexOf(slideElement);
                if (foundIndex >= 0) {
                  slideIndex = foundIndex;
                }
              } else {
                if (swiperComponent.initSwiper && typeof swiperComponent.initSwiper.activeIndex === 'number') {
                  slideIndex = mediaIndex;
                }
              }
            }
          }

          let targetThumbnail = thumbnailButtons.find((button) => {
            const index = parseInt(button.getAttribute('data-index'), 10);
            return !isNaN(index) && index === slideIndex;
          });

          if (!targetThumbnail) {
            targetThumbnail = thumbnailButtons.find((button) => {
              const index = parseInt(button.getAttribute('data-index'), 10);
              return !isNaN(index) && index === mediaIndex;
            });
          }

          if (targetThumbnail) {
            const finalSlideIndex = parseInt(targetThumbnail.getAttribute('data-index'), 10);

            this.syncThumbnailSwiper(thumbnailsContainer, thumbnailButtons, targetThumbnail, finalSlideIndex);
          }
        } catch (e) {
          // silent
        }
      }

      /**
       * Sync thumbnail swiper to show the active thumbnail
       * @param {HTMLElement} thumbnailsContainer - The thumbnail container element
       * @param {Array} thumbnailButtons - Array of all thumbnail buttons
       * @param {HTMLElement} targetThumbnail - The active thumbnail button
       * @param {number} slideIndex - The slide index to sync to
       */
      syncThumbnailSwiper(thumbnailsContainer, thumbnailButtons, targetThumbnail, slideIndex) {
        try {
          const waitForThumbnailSwiper = (retries = 10) => {
            const swiperComponent = this.querySelector('swiper-component');
            let thumbsSwiper = null;

            if (swiperComponent && swiperComponent.initSwiper && swiperComponent.initSwiper.params && swiperComponent.initSwiper.params.thumbs) {
              thumbsSwiper = swiperComponent.initSwiper.params.thumbs.swiper;
            }

            if (!thumbsSwiper) {
              const thumbnailSwiper = thumbnailsContainer.querySelector('.swiper');
              if (thumbnailSwiper && thumbnailSwiper.swiper) {
                thumbsSwiper = thumbnailSwiper.swiper;
              }
            }

            if (thumbsSwiper) {
              if (slideIndex >= 0 && slideIndex < thumbnailButtons.length) {
                thumbsSwiper.slideTo(slideIndex, 300);
              }
            } else if (retries > 0) {
              setTimeout(() => waitForThumbnailSwiper(retries - 1), 50);
            }
          };

          waitForThumbnailSwiper();
        } catch (e) {
          // silent
        }
      }

      /**
       * Swap media in grid layout: move variant image to first position
       * @param {HTMLElement} mediaElement - The active media element
       * @param {number} mediaIndex - The index of the media in the gallery
       */
      swapGridMedia() {
        try {
          if (typeof MainEvents !== 'undefined' && MainEvents.variantUpdate) {
            const handleVariantUpdateOnce = (event) => {
              try {
                const source = event?.detail?.data?.html;
                if (!source) return;

                const newMediaGallery = source.querySelector('media-gallery');
                if (!newMediaGallery) return;
                this.replaceWith(newMediaGallery);

                try {
                  newMediaGallery.scrollIntoView({ behavior: 'smooth' });
                } catch (e) {
                  // ignore scrolling errors
                }

                if (newMediaGallery.hasAttribute('data-zoom-on-hover')) {
                  document.dispatchEvent(new CustomEvent('product:inline-zoom-reinit'));
                }
              } catch (e) {
                // silent
              } finally {
                document.removeEventListener(MainEvents.variantUpdate, handleVariantUpdateOnce);
              }
            };
            document.addEventListener(MainEvents.variantUpdate, handleVariantUpdateOnce);
          }
          
        } catch (e) {
          // silent
        }
      }
    }
  );
}