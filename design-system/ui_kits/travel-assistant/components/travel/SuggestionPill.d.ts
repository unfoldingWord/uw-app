/**
 * A prompt suggestion in the drifting pill field below the composer
 * ("Hotel check-in", "Help me beat jet lag").
 */
export interface SuggestionPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  children?:React.ReactNode;
}
export declare function SuggestionPill(props:SuggestionPillProps):JSX.Element;
