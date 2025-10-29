import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Notify({ message, show, onClose, duration = 3000, type = "info" }) {
    // Auto close after duration
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    const typeClasses = {
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
        warning: "bg-yellow-500 text-black",
        info: "bg-blue-500 text-white",
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className={`fixed top-5 right-1/2 transform translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs ${typeClasses[type]}`}
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}