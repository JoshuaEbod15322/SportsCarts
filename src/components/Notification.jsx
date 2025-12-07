import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const Notification = ({
  type = "success",
  message,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-green-100",
      border: "border-green-200",
      text: "text-green-800",
      iconColor: "text-green-600",
    },
    error: {
      icon: XCircle,
      bg: "bg-red-100",
      border: "border-red-200",
      text: "text-red-800",
      iconColor: "text-red-600",
    },
    warning: {
      icon: AlertCircle,
      bg: "bg-yellow-100",
      border: "border-yellow-200",
      text: "text-yellow-800",
      iconColor: "text-yellow-600",
    },
    info: {
      icon: AlertCircle,
      bg: "bg-blue-100",
      border: "border-blue-200",
      text: "text-blue-800",
      iconColor: "text-blue-600",
    },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bg} border ${border} rounded-lg shadow-lg animate-slide-in`}
    >
      <div className="flex items-center gap-3 p-4 min-w-[300px]">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <div className="flex-1">
          <p className={`font-medium ${text}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`p-1 hover:opacity-70 transition-opacity ${text}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Notification;
