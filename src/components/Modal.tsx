import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";

interface ModalProps {
  buttonText: string;
  children: preact.VNode;
  overlayClassName?: string;
  modalClassName?: string;
  closeButtonClassName?: string;
  /**
   * ?Customizes the styling of the open-modal button.
   * *- Use "default" for the default button styling.
   * *- Use "link" for a clickable link style.
   * ?- Any other string is interpreted as Tailwind CSS classes.
   */
  buttonClassName?: "default" | "link" | string;
}

const Modal = ({
  buttonText,
  children,
  overlayClassName = "",
  modalClassName = "",
  closeButtonClassName = "",
  buttonClassName = "default",
}: ModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Compute the class for the open-modal button based on the prop value.
  const computedButtonClass =
    buttonClassName === "default"
      ? "px-4 py-2 bg-primary text-primary-content rounded hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary"
      : buttonClassName === "link"
        ? "text-primary hover:underline hover:text-info"
        : buttonClassName;

  // Function to open the modal.
  const openModal = () => setIsOpen(true);

  // Function to close the modal.
  const closeModal = () => setIsOpen(false);

  // Handle Escape key press to close the modal and disable scrolling when open.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    }

    // Cleanup event listener on component unmount.
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Optional: Focus management for accessibility.
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  return h(
    "div",
    null,
    /* Open Modal Button */
    h(
      "button",
      { onClick: openModal, className: computedButtonClass },
      buttonText
    ),

    /* Modal Overlay */
    isOpen &&
      h(
        "div",
        {
          className: `fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-60 backdrop-blur-sm z-50 ${overlayClassName}`,
          onClick: closeModal,
          "aria-modal": "true",
          role: "dialog",
          "aria-labelledby": "modal-heading",
          "aria-describedby": "modal-content",
        },
        /* Modal Content */
        h(
          "div",
          {
            ref: modalRef,
            tabIndex: -1,
            className: `bg-base-200 text-base-content border-4 border-primary rounded-lg shadow-lg w-11/12 max-w-full p-6 relative ${modalClassName}`,
            onClick: (e: { stopPropagation: () => any }) => e.stopPropagation(), // Prevent closing when clicking inside the modal.
          },
          /* Close Button */
          h(
            "button",
            {
              type: "button",
              className: `absolute top-2 right-2 text-secondary hover:text-error focus:outline-none ${closeButtonClassName}`,
              onClick: closeModal,
              "aria-label": "Close modal",
            },
            "\u00D7"
          ),

          /* Modal Content */
          h("div", { className: "modal-content" }, children)
        )
      )
  );
};

export default Modal;
