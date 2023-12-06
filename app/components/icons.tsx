import { memo } from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

const standardProps = {
  width: "1em",
  height: "1em",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
} as const;

export function SendToBack16() {
  return (
    <svg
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <path d="M28,10H22V4a2,2,0,0,0-2-2H4A2,2,0,0,0,2,4V20a2,2,0,0,0,2,2h6v6a2.0023,2.0023,0,0,0,2,2H28a2.0023,2.0023,0,0,0,2-2V12A2.0023,2.0023,0,0,0,28,10ZM12,28V12H28l.0015,16Z" />
    </svg>
  );
}

/**
 * From carbon icons
 */
export function FolderAdd16() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 32 32"
    >
      <polygon
        fill="currentColor"
        points="26,20 24,20 24,24 20,24 20,26 24,26 24,30 26,30 26,26 30,26 30,24 26,24 "
      />
      <path
        fill="currentColor"
        d="M28,8H16l-3.4-3.4C12.2,4.2,11.7,4,11.2,4H4C2.9,4,2,4.9,2,6v20c0,1.1,0.9,2,2,2h14v-2H4V6h7.2l3.4,3.4l0.6,0.6H28v8h2v-8
	C30,8.9,29.1,8,28,8z"
      />
      <rect id="_Transparent_Rectangle_" fill="none" width="32" height="32" />
    </svg>
  );
}

export function Folder16(attrs: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      {...attrs}
    >
      <path
        fill="currentColor"
        d="M11.17,6l3.42,3.41.58.59H28V26H4V6h7.17m0-2H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V10a2,2,0,0,0-2-2H16L12.59,4.59A2,2,0,0,0,11.17,4Z"
      />
    </svg>
  );
}

export function FolderDetails(attrs: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      {...attrs}
    >
      <rect fill="currentColor" x="16" y="20" width="14" height="2" />
      <rect fill="currentColor" x="16" y="24" width="14" height="2" />
      <rect fill="currentColor" x="16" y="28" width="7" height="2" />
      <path
        fill="currentColor"
        d="M14,26H4V6h7.17l3.42,3.41.58.59H28v8h2V10a2,2,0,0,0-2-2H16L12.59,4.59A2,2,0,0,0,11.17,4H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H14Z"
      />
    </svg>
  );
}

export function ShapeIntersect16() {
  return (
    <svg
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <path d="M28,10H22V4a2.0025,2.0025,0,0,0-2-2H4A2.0025,2.0025,0,0,0,2,4V20a2.0025,2.0025,0,0,0,2,2h6v6a2.0025,2.0025,0,0,0,2,2H28a2.0025,2.0025,0,0,0,2-2V12A2.0025,2.0025,0,0,0,28,10ZM4,20V4H20v6H12a2.0025,2.0025,0,0,0-2,2v8Zm8,8V22h8a2.0025,2.0025,0,0,0,2-2V12h6V28Z" />
    </svg>
  );
}

export function ShapeUnite16() {
  return (
    <svg
      id="icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      <path d="M28,10H22V4a2,2,0,0,0-2-2H4A2,2,0,0,0,2,4V20a2,2,0,0,0,2,2h6v6a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V12A2,2,0,0,0,28,10Z" />
    </svg>
  );
}

export const PlacemarkIcon = memo(function PlacemarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 300 300" fill="none" {...props}>
      <circle cx="75" cy="75" r="17.5" stroke="#9333EA" strokeWidth="15" />
      <circle cx="225" cy="225" r="17.5" stroke="#9333EA" strokeWidth="15" />
      <circle cx="225" cy="75" r="17.5" stroke="#9333EA" strokeWidth="15" />
      <circle cx="75" cy="225" r="17.5" stroke="#9333EA" strokeWidth="15" />
      <line
        x1="75"
        y1="95"
        x2="75"
        y2="208"
        stroke="#9333EA"
        strokeWidth="20"
      />
      <line
        x1="226"
        y1="95"
        x2="226"
        y2="208"
        stroke="#9333EA"
        strokeWidth="20"
      />
      <line
        x1="95"
        y1="75"
        x2="208"
        y2="75"
        stroke="#9333EA"
        strokeWidth="20"
      />
      <line
        x1="95"
        y1="225"
        x2="208"
        y2="225"
        stroke="#9333EA"
        strokeWidth="20"
      />
      <rect x="110" y="110" width="80" height="80" rx="5" fill="#9333EA" />
    </svg>
  );
});

export const ConvexIcon = memo(function ConvexIcon(props: IconProps) {
  return (
    <svg {...standardProps} {...props}>
      <path
        d="M9.82901 13.1824C9.89298 13.2424 9.98369 13.2644 10.0681 13.2406C10.1524 13.2167 10.2181 13.1504 10.2412 13.0658L13.2412 2.06578C13.2617 1.99061 13.246 1.91017 13.1987 1.84825C13.1514 1.78633 13.0779 1.75 13 1.75H6C5.93944 1.75 5.88095 1.77198 5.83537 1.81186L1.83537 5.31186C1.78225 5.35834 1.75125 5.42513 1.75004 5.49571C1.74883 5.56629 1.77751 5.6341 1.82901 5.68238L9.82901 13.1824Z"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <mask id="path-2-inside-1" fill="white">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 13L13 2H6L2 5.5L10 13ZM4.5 5.5C4.5 5.91421 4.16421 6.25 3.75 6.25C3.33579 6.25 3 5.91421 3 5.5C3 5.08579 3.33579 4.75 3.75 4.75C4.16421 4.75 4.5 5.08579 4.5 5.5ZM11.75 3.75C12.1642 3.75 12.5 3.41421 12.5 3C12.5 2.58579 12.1642 2.25 11.75 2.25C11.3358 2.25 11 2.58579 11 3C11 3.41421 11.3358 3.75 11.75 3.75ZM7.25 3C7.25 3.41421 6.91421 3.75 6.5 3.75C6.08579 3.75 5.75 3.41421 5.75 3C5.75 2.58579 6.08579 2.25 6.5 2.25C6.91421 2.25 7.25 2.58579 7.25 3ZM9.25 11.5C9.66421 11.5 10 11.1642 10 10.75C10 10.3358 9.66421 10 9.25 10C8.83579 10 8.5 10.3358 8.5 10.75C8.5 11.1642 8.83579 11.5 9.25 11.5Z"
        />
      </mask>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 13L13 2H6L2 5.5L10 13ZM4.5 5.5C4.5 5.91421 4.16421 6.25 3.75 6.25C3.33579 6.25 3 5.91421 3 5.5C3 5.08579 3.33579 4.75 3.75 4.75C4.16421 4.75 4.5 5.08579 4.5 5.5ZM11.75 3.75C12.1642 3.75 12.5 3.41421 12.5 3C12.5 2.58579 12.1642 2.25 11.75 2.25C11.3358 2.25 11 2.58579 11 3C11 3.41421 11.3358 3.75 11.75 3.75ZM7.25 3C7.25 3.41421 6.91421 3.75 6.5 3.75C6.08579 3.75 5.75 3.41421 5.75 3C5.75 2.58579 6.08579 2.25 6.5 2.25C6.91421 2.25 7.25 2.58579 7.25 3ZM9.25 11.5C9.66421 11.5 10 11.1642 10 10.75C10 10.3358 9.66421 10 9.25 10C8.83579 10 8.5 10.3358 8.5 10.75C8.5 11.1642 8.83579 11.5 9.25 11.5Z"
        fill="currentColor"
      />
      <path
        d="M13 2L13.9648 2.26312L14.3093 1H13V2ZM10 13L9.31606 13.7295L10.5278 14.8655L10.9648 13.2631L10 13ZM6 2V1H5.62426L5.3415 1.24742L6 2ZM2 5.5L1.3415 4.74742L0.510621 5.47444L1.31606 6.22954L2 5.5ZM12.0352 1.73688L9.03524 12.7369L10.9648 13.2631L13.9648 2.26312L12.0352 1.73688ZM6 3H13V1H6V3ZM2.6585 6.25258L6.6585 2.75258L5.3415 1.24742L1.3415 4.74742L2.6585 6.25258ZM10.6839 12.2705L2.68394 4.77046L1.31606 6.22954L9.31606 13.7295L10.6839 12.2705ZM3.75 7.25C4.7165 7.25 5.5 6.4665 5.5 5.5H3.5C3.5 5.36193 3.61193 5.25 3.75 5.25V7.25ZM2 5.5C2 6.4665 2.7835 7.25 3.75 7.25V5.25C3.88807 5.25 4 5.36193 4 5.5H2ZM3.75 3.75C2.7835 3.75 2 4.5335 2 5.5H4C4 5.63807 3.88807 5.75 3.75 5.75V3.75ZM5.5 5.5C5.5 4.5335 4.7165 3.75 3.75 3.75V5.75C3.61193 5.75 3.5 5.63807 3.5 5.5H5.5ZM11.5 3C11.5 2.86193 11.6119 2.75 11.75 2.75V4.75C12.7165 4.75 13.5 3.9665 13.5 3H11.5ZM11.75 3.25C11.6119 3.25 11.5 3.13807 11.5 3H13.5C13.5 2.0335 12.7165 1.25 11.75 1.25V3.25ZM12 3C12 3.13807 11.8881 3.25 11.75 3.25V1.25C10.7835 1.25 10 2.0335 10 3H12ZM11.75 2.75C11.8881 2.75 12 2.86193 12 3H10C10 3.9665 10.7835 4.75 11.75 4.75V2.75ZM6.5 4.75C7.4665 4.75 8.25 3.9665 8.25 3H6.25C6.25 2.86193 6.36193 2.75 6.5 2.75V4.75ZM4.75 3C4.75 3.9665 5.5335 4.75 6.5 4.75V2.75C6.63807 2.75 6.75 2.86193 6.75 3H4.75ZM6.5 1.25C5.5335 1.25 4.75 2.0335 4.75 3H6.75C6.75 3.13807 6.63807 3.25 6.5 3.25V1.25ZM8.25 3C8.25 2.0335 7.4665 1.25 6.5 1.25V3.25C6.36193 3.25 6.25 3.13807 6.25 3H8.25ZM9 10.75C9 10.6119 9.11193 10.5 9.25 10.5V12.5C10.2165 12.5 11 11.7165 11 10.75H9ZM9.25 11C9.11193 11 9 10.8881 9 10.75H11C11 9.7835 10.2165 9 9.25 9V11ZM9.5 10.75C9.5 10.8881 9.38807 11 9.25 11V9C8.2835 9 7.5 9.7835 7.5 10.75H9.5ZM9.25 10.5C9.38807 10.5 9.5 10.6119 9.5 10.75H7.5C7.5 11.7165 8.2835 12.5 9.25 12.5V10.5Z"
        fill="currentColor"
        mask="url(#path-2-inside-1)"
      />
    </svg>
  );
});
