if (!customElements.get("quick-view-modal")) {
    customElements.define(
      "quick-view-modal",
      class QuickViewModal extends ModalDialog {
        constructor() {
          super();
          this.modalContent = this.querySelector("#QuickViewModal");

          this.addEventListener("product-info:loaded", ({ target }) => {
            target.addPreProcessCallback(this.preprocessHTML.bind(this));
          });
        }

        hide(preventFocus = false) {
          const cartNotification = document.querySelector("cart-drawer");
          if (cartNotification)
            cartNotification.setActiveElement(this.openedBy);
          setTimeout(() => (this.modalContent.innerHTML = ""), 500);

          if (preventFocus) this.openedBy = null;
          super.hide();
        }

        show(opener) {
          opener.setAttribute("aria-disabled", true);
          opener.classList.add("loading");
          opener.querySelector(".loading__spinner").classList.remove("hidden");

          const isCustomLayout = this.dataset.layout === "custom" || this.classList.contains("quick-view-modal--custom");

          fetch(opener.getAttribute("data-product-url").split("?")[0])
            .then((response) => response.text())
            .then((responseText) => {
              const responseHTML = new DOMParser().parseFromString(
                responseText,
                "text/html"
              );
              const productElement = responseHTML.querySelector("product-info");

              this.preprocessHTML(productElement);
              HTMLUpdateUtility.setInnerHTML(
                this.modalContent,
                productElement.outerHTML
              );

              if (isCustomLayout) {
                this.modalContent.classList.add("quick-view-modal--custom", "qv-custom-layout");
                this.transformMediaGallery(this.modalContent);
              }

              if (typeof window.initProductSubtotals === "function") {
                window.initProductSubtotals(this.modalContent);
              }

              if (typeof window.compareColor === 'undefined' && !customElements.get('compare-color')) {
                try { window.compareColor(); } catch (e) { /* no-op */ }
              }

              if (window.Shopify && Shopify.PaymentButton)
                Shopify.PaymentButton.init();
              if (window.ProductModel) window.ProductModel.loadShopifyXR();

              super.show(opener);
            })
            .finally(() => {
              opener.removeAttribute("aria-disabled");
              opener.classList.remove("loading");
              opener.querySelector(".loading__spinner").classList.add("hidden");
            });
        }

        preprocessHTML(productElement) {
          const isCustomLayout = this.dataset.layout === "custom" || this.classList.contains("quick-view-modal--custom");

          productElement.classList.forEach((classApplied) => {
            if (
              classApplied.startsWith("color-") ||
              classApplied === "gradient"
            )
              this.modalContent.classList.add(classApplied);
          });

          if (isCustomLayout) {
            productElement.classList.add("quick-view-modal--custom", "qv-custom-layout");
          }

          this.preventDuplicatedIDs(productElement);
          this.removeDOMElements(productElement);
          this.removeGalleryListSemantic(productElement);
          this.preventVariantURLSwitching(productElement);
        }

        transformMediaGallery(container) {
          const mediaCol = container.querySelector(".product-information__media, [data-testid='product-information-media']");
          if (!mediaCol) return;

          const imgElements = Array.from(mediaCol.querySelectorAll("img"));
          if (imgElements.length === 0) return;

          const uniqueSrcs = [];
          const images = [];

          imgElements.forEach((img) => {
            const src = img.src || img.getAttribute("srcset")?.split(" ")[0] || img.dataset.src;
            const alt = img.alt || "";
            if (src && !uniqueSrcs.includes(src) && !src.includes("icon") && !src.includes("logo") && !alt.toLowerCase().includes("size")) {
              uniqueSrcs.push(src);
              images.push({ src, alt });
            }
          });

          if (images.length === 0) return;

          mediaCol.className = "qv-custom-gallery";
          mediaCol.innerHTML = "";

          const thumbsWrapper = document.createElement("div");
          thumbsWrapper.className = "qv-custom-thumbs-wrapper";

          const upBtn = document.createElement("button");
          upBtn.type = "button";
          upBtn.className = "qv-custom-thumb-nav nav-up";
          upBtn.ariaLabel = "Scroll Up";
          upBtn.innerHTML = `<svg aria-hidden='true' focusable='false' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'><path fill='currentColor' d='M4.465 366.475l7.07 7.071c4.686 4.686 12.284 4.686 16.971 0L224 178.053l195.494 195.493c4.686 4.686 12.284 4.686 16.971 0l7.07-7.071c4.686-4.686 4.686-12.284 0-16.97l-211.05-211.051c-4.686-4.686-12.284-4.686-16.971 0L4.465 349.505c-4.687 4.686-4.687 12.284 0 16.97z'></path></svg>`;

          const thumbsList = document.createElement("div");
          thumbsList.className = "qv-custom-thumbs-list";

          const downBtn = document.createElement("button");
          downBtn.type = "button";
          downBtn.className = "qv-custom-thumb-nav nav-down";
          downBtn.ariaLabel = "Scroll Down";
          downBtn.innerHTML = `<svg aria-hidden='true' focusable='false' role='img' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'><path fill='currentColor' d='M443.5 162.6l-7.1-7.1c-4.7-4.7-12.3-4.7-17 0L224 351 28.5 155.5c-4.7-4.7-12.3-4.7-17 0l-7.1 7.1c-4.7 4.7-4.7 12.3 0 17l211 211.1c4.7 4.7 12.3 4.7 17 0l211-211.1c4.8-4.7 4.8-12.3.1-17z'></path></svg>`;

          const mainImgBox = document.createElement("div");
          mainImgBox.className = "qv-custom-main-image";
          const mainImg = document.createElement("img");
          mainImg.src = images[0].src;
          mainImg.alt = images[0].alt;
          mainImgBox.appendChild(mainImg);

          images.forEach((imgData, index) => {
            const thumbItem = document.createElement("div");
            thumbItem.className = `qv-custom-thumb-item ${index === 0 ? "is-active" : ""}`;
            thumbItem.innerHTML = `<img src="${imgData.src}" alt="${imgData.alt}">`;
            thumbItem.addEventListener("click", () => {
              thumbsList.querySelectorAll(".qv-custom-thumb-item").forEach((el) => el.classList.remove("is-active"));
              thumbItem.classList.add("is-active");
              mainImg.src = imgData.src;
              mainImg.alt = imgData.alt;
            });
            thumbsList.appendChild(thumbItem);
          });

          const updateNavButtons = () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
              const scrollLeft = thumbsList.scrollLeft;
              const maxScroll = thumbsList.scrollWidth - thumbsList.clientWidth;
              upBtn.style.display = scrollLeft <= 2 ? "none" : "flex";
              downBtn.style.display = (maxScroll <= 2 || scrollLeft >= maxScroll - 2) ? "none" : "flex";
            } else {
              const scrollTop = thumbsList.scrollTop;
              const maxScroll = thumbsList.scrollHeight - thumbsList.clientHeight;
              upBtn.style.display = scrollTop <= 2 ? "none" : "flex";
              downBtn.style.display = (maxScroll <= 2 || scrollTop >= maxScroll - 2) ? "none" : "flex";
            }
          };

          const getScrollStep = () => {
            const firstItem = thumbsList.querySelector(".qv-custom-thumb-item");
            if (!firstItem) return 100;
            const style = window.getComputedStyle(thumbsList);
            const gap = parseFloat(style.gap) || 8;
            if (window.innerWidth <= 768) {
              return firstItem.offsetWidth + gap;
            } else {
              return firstItem.offsetHeight + gap;
            }
          };

          upBtn.addEventListener("click", () => {
            const step = getScrollStep();
            if (window.innerWidth <= 768) {
              thumbsList.scrollBy({ left: -step, behavior: "smooth" });
            } else {
              thumbsList.scrollBy({ top: -step, behavior: "smooth" });
            }
          });
          downBtn.addEventListener("click", () => {
            const step = getScrollStep();
            if (window.innerWidth <= 768) {
              thumbsList.scrollBy({ left: step, behavior: "smooth" });
            } else {
              thumbsList.scrollBy({ top: step, behavior: "smooth" });
            }
          });

          thumbsList.addEventListener("scroll", updateNavButtons);

          thumbsWrapper.appendChild(upBtn);
          thumbsWrapper.appendChild(thumbsList);
          thumbsWrapper.appendChild(downBtn);

          mediaCol.appendChild(thumbsWrapper);
          mediaCol.appendChild(mainImgBox);

          setTimeout(updateNavButtons, 50);
        }

        preventVariantURLSwitching(productElement) {
          productElement.setAttribute("data-update-url", "false");
        }

        removeDOMElements(productElement) {
          const pickupAvailability = productElement.querySelector(
            "pickup-availability"
          );
          if (pickupAvailability) pickupAvailability.remove();

          const shareButton = productElement.querySelector("share-button");
          if (shareButton) shareButton.remove();

          const productModal = productElement.querySelector("product-modal");
          if (productModal) productModal.remove();

          const modalDialog = productElement.querySelectorAll("modal-dialog");
          if (modalDialog) modalDialog.forEach((modal) => modal.remove());

          const sideDrawerOpener = productElement.querySelectorAll(
            "side-drawer-opener:not(.agree-condition-popup-modal__opener--keep)"
          );
          if (sideDrawerOpener)
            sideDrawerOpener.forEach((button) => button.remove());

          const sideDrawer = productElement.querySelectorAll(
            "side-drawer:not(.agree-condition-popup-modal__drawer--keep)"
          );
          if (sideDrawer) sideDrawer.forEach((drawer) => drawer.remove());
        }

        preventDuplicatedIDs(productElement) {
          const sectionId = productElement.dataset.section;

          const oldId = sectionId;
          const newId = `quickview-${sectionId}`;

          productElement.innerHTML = productElement.innerHTML.replaceAll(
            oldId,
            newId
          );
          Array.from(productElement.attributes).forEach((attribute) => {
            if (attribute.value.includes(oldId)) {
              productElement.setAttribute(
                attribute.name,
                attribute.value.replace(oldId, newId)
              );
            }
          });

          productElement.dataset.originalSection = sectionId;
        }

        removeGalleryListSemantic(productElement) {
          const galleryList = productElement.querySelector(
            '[id^="Slider-Gallery"]'
          );
          if (!galleryList) return;

          galleryList.setAttribute("role", "presentation");
          galleryList
            .querySelectorAll('[id^="Slide-"]')
            .forEach((li) => li.setAttribute("role", "presentation"));
        }
      }
    );
}
