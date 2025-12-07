// components/ForceDeleteModal.jsx
import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

const ForceDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType = "product",
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (itemType) {
      case "product":
        return "Force Delete Product";
      case "order":
        return "Force Delete Order";
      default:
        return "Force Delete Item";
    }
  };

  const getMessage = () => {
    switch (itemType) {
      case "product":
        return `This product exists in orders. Force delete will:
• Remove the product from all orders
• Break order history for customers
• Permanently delete all related data
• This action cannot be undone

Are you absolutely sure you want to continue?`;
      case "order":
        return `This order will be permanently deleted:
• All order items will be removed
• Order history will be lost
• This action cannot be undone

Are you absolutely sure you want to continue?`;
      default:
        return "This action will permanently delete the item and all related data. This cannot be undone.";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b bg-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-semibold text-red-600">{getTitle()}</h3>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">
                <strong>Warning:</strong> This is a destructive action that
                affects customer order history.
              </p>
            </div>
          </div>

          <p className="text-gray-600 whitespace-pre-line mb-4">
            {getMessage()}
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
              Force Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForceDeleteModal;
