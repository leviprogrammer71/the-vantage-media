import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1A1A1A] group-[.toaster]:text-white group-[.toaster]:border-l-4 group-[.toaster]:border-[#E8C547] group-[.toaster]:border-t-0 group-[.toaster]:border-r-0 group-[.toaster]:border-b-0 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.6)] group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-[#AAAAAA]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:border-l-[#E53935]",
          success: "group-[.toaster]:border-l-[#E8C547]",
          info: "group-[.toaster]:border-l-[#444444]",
        },
        style: {
          fontFamily: "'Space Mono', monospace",
          fontSize: "12px",
        },
      }}
      style={{
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
