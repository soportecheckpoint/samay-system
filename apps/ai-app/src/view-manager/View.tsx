import useViewStore from './view-manager-store'
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";

interface ViewProps {
  viewId: string;
  children: React.ReactNode;
  style?: MotionStyle;
}

const View: React.FC<ViewProps> = ({ viewId, style, children }) => {
  const currentView = useViewStore((state) => state.currentView);

  const isVisible = currentView === viewId;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          style={{
            ...style,
            willChange: "transform, filter",
          }}
          key={viewId}
          className="absolute top-0 left-0 w-full h-full overflow-hidden"
          initial={{ x: "100%", filter: "blur(14px)" }}
          animate={{
            x: 0,
            filter: ["blur(14px)", "blur(6px)", "blur(2px)", "blur(0px)"],
            transition: {
              x: { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] },
              filter: { duration: 0.38, ease: "linear" },
            },
          }}
          exit={{
            x: "-100%",
            filter: ["blur(0px)", "blur(6px)", "blur(14px)"],
            transition: {
              x: { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] },
              filter: { duration: 0.38, ease: "linear" },
            },
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default View;
