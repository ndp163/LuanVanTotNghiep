import numpy as np
import cv2
import matplotlib.pyplot as plt
from matplotlib.colors import NoNorm
from shirt_detection import detect
import sys

"""
read_image:
  color: True => reading as color image (default) in RGB format
  color: False => reading as gray
"""


# def read_image(filename, color=True):
#     return cv2.cvtColor(cv2.imread(filename, 1 if color else 0), cv2.COLOR_BGR2RGB)


# """
# if image_data is in color format then RGB must be used
# """


# def write_image(filename, image_data):
#     image_data = cv2.cvtColor(image_data, cv2.COLOR_RGB2BGR)
#     cv2.imwrite(filename, image_data)


# def show_image(image, title="sample", figsize=(8, 6)):
#     plt.figure(figsize=figsize)
#     if image.ndim == 2:
#         plt.imshow(image, cmap="gray", norm=NoNorm())
#     else:
#         plt.imshow(image)
#     plt.title(title)
#     plt.show()


# orb = cv2.SIFT_create()
# bf = cv2.BFMatcher()

# def match(file1, file2):
#     image_color1 = read_image(file1)
#     image_color2 = read_image(file2)

#     try:
#         bounding_boxes_1 = detect(source=file1)
#         bounding_boxes_2 = detect(source=file2)
#     except:
#         return False

#     if len(bounding_boxes_1) == 0 or len(bounding_boxes_2) == 0:
#         return False

#     def is_in_box(x, y, bounding_boxes):
#         for bounding_box in bounding_boxes:
#             if bounding_box[0] - 5 <= x <= bounding_box[2] + 5 and bounding_box[1] - 5 <= y <= bounding_box[3] + 5:
#                 return True
#         return False

#     kp1, des1 = orb.detectAndCompute(image_color1, None)
#     kp2, des2 = orb.detectAndCompute(image_color2, None)

#     matches = bf.knnMatch(des1, des2, k=2)
#     good = []

#     def accept(dmatch):
#         m, n = dmatch
#         if m.distance < 0.5 * n.distance:

#             img1_idx = m.queryIdx
#             img2_idx = m.trainIdx

#             (x1, y1) = kp1[img1_idx].pt
#             (x2, y2) = kp2[img2_idx].pt

#             print(x1, y1, x2, y2)
#             if is_in_box(x1, y1, bounding_boxes_1) and is_in_box(x2, y2, bounding_boxes_2):
#                 good.append([m])

#     accept_vectorize = np.vectorize(accept, signature='(n)->()')
#     accept_vectorize(matches)

#     iii = cv2.drawMatchesKnn(image_color1, kp1, image_color2, kp2, good, None)
#     write_image('out.jpg', iii)

#     return len(good) > 5

# print('result:', match(sys.argv[1], sys.argv[2]))

print('result:', 222222222)