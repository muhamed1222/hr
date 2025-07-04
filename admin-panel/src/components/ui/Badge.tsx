import { cn } from "@/lib/utils"

const Badge = ({ className, variant = "default", children, ...props }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80": variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80": variant === "destructive",
          "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
          "border-transparent bg-green-500 text-white hover:bg-green-600": variant === "success",
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600": variant === "warning",
          "border-transparent bg-red-500 text-white hover:bg-red-600": variant === "error",
          "border-transparent bg-blue-500 text-white hover:bg-blue-600": variant === "info",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Badge } 