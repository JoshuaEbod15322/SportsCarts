import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  LogOut,
  ArrowLeft,
  ShoppingCart,
  X,
  AlertCircle,
  Camera,
  Upload,
  Loader,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import ConfirmModal from "./components/ConfirmModal";
import Notification from "./components/Notification";

const AccountPage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    avatar: "",
    joinDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [notification, setNotification] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const statusConfig = {
    delivered: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    shipped: { icon: Truck, color: "text-blue-600", bg: "bg-blue-100" },
    processing: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    cancelled: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
    default: { icon: Package, color: "text-gray-600", bg: "bg-gray-100" },
  };

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === "orders") {
      fetchUserOrders();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Fetch from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!userError && userData) {
          setUserData({
            name: userData.full_name || "",
            email: user.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
            city: userData.city || "",
            state: userData.state || "",
            zipCode: userData.zip_code || "",
            country: userData.country || "United States",
            avatar: userData.avatar_url || "",
            joinDate: new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            }),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchUserOrders = async () => {
    try {
      setLoadingOrders(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: ordersData, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            order_items (
              *
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Transform data to match expected format
        const formattedOrders = ordersData.map((order) => ({
          id: order.id,
          orderNumber: order.order_number,
          date: new Date(order.created_at).toLocaleDateString(),
          items:
            order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ||
            0,
          total: parseFloat(order.total_amount),
          status: order.status,
          payment_status: order.payment_status || "pending",
        }));

        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        showNotification(
          "Please upload a valid image (JPEG, PNG, GIF, WEBP)",
          "error"
        );
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Image size must be less than 5MB", "error");
        return;
      }

      setUploadingAvatar(true);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old avatar if exists
      const { data: oldUserData } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (oldUserData?.avatar_url) {
        const oldFileName = oldUserData.avatar_url.split("/").pop();
        await supabase.storage.from("user-avatar").remove([oldFileName]);
      }

      // Upload new avatar to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("user-avatar")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("user-avatar")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl)
        throw new Error("Failed to get public URL");

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from("users")
        .update({
          avatar_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setUserData((prev) => ({
        ...prev,
        avatar: publicUrlData.publicUrl,
      }));

      showNotification("Profile picture updated successfully!", "success");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showNotification(
        "Failed to upload profile picture. Please try again.",
        "error"
      );
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Get current avatar URL
      const { data: userData } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (userData?.avatar_url) {
        // Delete from storage
        const fileName = userData.avatar_url.split("/").pop();
        await supabase.storage.from("user-avatar").remove([fileName]);
      }

      // Update user profile to remove avatar URL
      const { error } = await supabase
        .from("users")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update local state
      setUserData((prev) => ({
        ...prev,
        avatar: "",
      }));
      setAvatarPreview(null);

      showNotification("Profile picture removed successfully!", "success");
    } catch (error) {
      console.error("Error removing avatar:", error);
      showNotification(
        "Failed to remove profile picture. Please try again.",
        "error"
      );
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Save to users table only
        const { error } = await supabase
          .from("users")
          .update({
            full_name: userData.name.trim(),
            phone: userData.phone.trim(),
            address: userData.address.trim(),
            city: userData.city.trim(),
            state: userData.state.trim(),
            zip_code: userData.zipCode.trim(),
            country: userData.country,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (error) throw error;

        setIsEditing(false);
        showNotification("Profile updated successfully!", "success");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showNotification("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    const {
      icon: Icon,
      color,
      bg,
    } = statusConfig[status] || statusConfig.default;
    return <Icon className={`w-5 h-5 ${color}`} />;
  };

  const getStatusBadgeClass = (status) => {
    const { color, bg } = statusConfig[status] || statusConfig.default;
    return `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bg} ${color}`;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setShowConfirmModal(true);
  };

  const handleConfirmCancelOrder = async () => {
    try {
      // Call orderService to cancel the order
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderToCancel.id);

      if (error) throw error;

      // Restore stock for each item in the order
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderToCancel.id);

      if (orderItems) {
        for (const item of orderItems) {
          // Get current stock
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (product) {
            const currentStock = parseInt(product.stock) || 0;
            const newStock = currentStock + item.quantity;

            await supabase
              .from("products")
              .update({
                stock: newStock,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.product_id);
          }
        }
      }

      // Update local state
      setOrders(
        orders.map((order) =>
          order.id === orderToCancel.id
            ? { ...order, status: "cancelled" }
            : order
        )
      );

      setShowConfirmModal(false);
      setOrderToCancel(null);
      showNotification("Order cancelled successfully!", "success");
    } catch (error) {
      console.error("Error cancelling order:", error);
      showNotification("Failed to cancel order. Please try again.", "error");
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const isOrderCancellable = (order) => {
    // Only allow cancellation for processing or shipped orders
    return order.status === "processing" || order.status === "shipped";
  };

  // Avatar display URL (use preview if uploading, otherwise use stored avatar)
  const displayAvatar = avatarPreview || userData.avatar;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Account
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your profile, orders, and preferences
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative w-24 h-24 mb-4 group">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={userData.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-400" />
                  </div>
                )}

                {/* Upload overlay */}
                {isEditing && (
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      id="avatar-upload"
                      disabled={uploadingAvatar}
                    />
                    {uploadingAvatar ? (
                      <Loader className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-white mb-1" />
                        <span className="text-white text-xs font-medium">
                          Change Photo
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Remove button */}
                {isEditing && displayAvatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-20"
                    disabled={uploadingAvatar}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="font-semibold text-lg">
                {userData.name || "User"}
              </h3>
              <p className="text-gray-600 text-sm">{userData.email}</p>
              <span className="text-gray-500 text-xs mt-1">
                Member since {userData.joinDate}
              </span>

              {/* Upload button for mobile */}
              {isEditing && (
                <div className="mt-4">
                  <label
                    htmlFor="avatar-upload-mobile"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      uploadingAvatar
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                    }`}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Change Profile Picture
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload-mobile"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG, GIF, WEBP (Max 5MB)
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "orders", label: "Orders", icon: ShoppingCart },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-600"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-4"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Personal Details
                  </h2>
                  <p className="text-gray-600">
                    Manage your personal information
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isEditing
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    label: "Full Name",
                    value: userData.name,
                    icon: User,
                    key: "name",
                    type: "text",
                  },
                  {
                    label: "Email Address",
                    value: userData.email,
                    icon: Mail,
                    key: "email",
                    type: "email",
                  },
                  {
                    label: "Phone Number",
                    value: userData.phone,
                    icon: Phone,
                    key: "phone",
                    type: "tel",
                  },
                  {
                    label: "Country",
                    value: userData.country,
                    icon: Globe,
                    key: "country",
                    type: "select",
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <field.icon className="w-4 h-4" />
                      {field.label}
                    </label>
                    {isEditing ? (
                      field.type === "select" ? (
                        <select
                          value={field.value}
                          onChange={(e) =>
                            setUserData({
                              ...userData,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="United States">United States</option>
                          <option value="Philippines">Philippines</option>
                          <option value="Canada">Canada</option>
                          <option value="Australia">Australia</option>
                          <option value="United Kingdom">United Kingdom</option>
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={field.value}
                          onChange={(e) =>
                            setUserData({
                              ...userData,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 rounded-lg">
                        {field.value || "Not set"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      label: "Street Address",
                      value: userData.address,
                      key: "address",
                      icon: MapPin,
                    },
                    {
                      label: "City",
                      value: userData.city,
                      key: "city",
                      icon: MapPin,
                    },
                    {
                      label: "State",
                      value: userData.state,
                      key: "state",
                      icon: MapPin,
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <field.icon className="w-4 h-4" />
                        {field.label}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) =>
                            setUserData({
                              ...userData,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <div className="px-4 py-2 bg-gray-50 rounded-lg">
                          {field.value || "Not set"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4" />
                      ZIP Code
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={userData.zipCode}
                        onChange={(e) =>
                          setUserData({ ...userData, zipCode: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter ZIP code"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 rounded-lg">
                        {userData.zipCode || "Not set"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4" />
                      Country
                    </label>
                    {isEditing ? (
                      <select
                        value={userData.country}
                        onChange={(e) =>
                          setUserData({ ...userData, country: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="United States">United States</option>
                        <option value="Philippines">Philippines</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                        <option value="United Kingdom">United Kingdom</option>
                      </select>
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 rounded-lg">
                        {userData.country || "Not set"}
                      </div>
                    )}
                  </div>
                </div>

                {!userData.address &&
                  !userData.city &&
                  !userData.state &&
                  !userData.zipCode && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-700 text-sm">
                        ⚠️ Your address is not set. Please add your address to
                        enable checkout.
                      </p>
                    </div>
                  )}
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setAvatarPreview(null);
                      fetchUserData(); // Reset to original data
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSaving || uploadingAvatar}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={isSaving || uploadingAvatar}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Order History
                </h2>
                <p className="text-gray-600">View and manage your orders</p>
              </div>

              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No orders yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start shopping to see your orders here
                  </p>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      {/* Order Header */}
                      <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <h3 className="font-bold text-gray-900">
                              {order.orderNumber}
                            </h3>
                            <span className={getStatusBadgeClass(order.status)}>
                              {getStatusIcon(order.status)}
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.date}
                          </div>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">
                              Items
                            </div>
                            <div className="font-semibold">
                              {order.items} items
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">
                              Total Amount
                            </div>
                            <div className="font-bold text-gray-900">
                              ${order.total.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">
                              Payment Status
                            </div>
                            <div
                              className={`font-semibold ${
                                order.payment_status === "paid"
                                  ? "text-green-600"
                                  : order.payment_status === "pending"
                                  ? "text-yellow-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {order.payment_status
                                ? order.payment_status.charAt(0).toUpperCase() +
                                  order.payment_status.slice(1)
                                : "Pending"}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end">
                          {isOrderCancellable(order) && (
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            >
                              <X className="w-4 h-4" />
                              Cancel Order
                            </button>
                          )}
                          {order.status === "cancelled" && (
                            <div className="flex items-center gap-2 px-4 py-2 text-gray-500 bg-gray-100 rounded-lg">
                              <XCircle className="w-4 h-4" />
                              <span>Order Cancelled</span>
                            </div>
                          )}
                          {order.status === "delivered" && (
                            <div className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg">
                              <CheckCircle className="w-4 h-4" />
                              <span>Order Delivered</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal for Order Cancellation */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setOrderToCancel(null);
        }}
        onConfirm={handleConfirmCancelOrder}
        title="Confirm Order Cancellation"
        message={`Are you sure you want to cancel order ${orderToCancel?.orderNumber}? This action will restore the stock and cannot be undone.`}
        type="warning"
      />

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default AccountPage;
