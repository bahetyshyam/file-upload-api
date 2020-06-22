export default function compare(a, b) {
  // Use toUpperCase() to ignore character casing
  const filename1 = a.filename.toUpperCase();
  const filename2 = b.filename.toUpperCase();

  let comparison = 0;
  if (filename1 > filename2) {
    comparison = 1;
  } else if (filename1 < filename2) {
    comparison = -1;
  }
  return comparison;
}
