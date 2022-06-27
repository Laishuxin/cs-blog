function leftBoundV1(nums: Array<number>, target: number): number {
  if (!nums.length) return -1;
  // [left, right)
  let left = 0,
    right = nums.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      right = mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return nums[left] === target ? left : -1;
}

function leftBoundV2(nums: Array<number>, target: number): number {
  let left = 0,
    right = nums.length;
  if (!right) return -1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return nums[left] === target ? left : -1;
}

function rightBoundV2(nums: Array<number>, target: number): number {
  let left = 0,
    right = nums.length;
  if (!right) return -1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) {
      left = mid + 1;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
}

export const leftBound = leftBoundV2;
