import torch
import cv2
import numpy as np
import matplotlib.cm as cm
import pandas as pd
import time
import glob

from LoFTR.src.utils.plotting import make_matching_figure
from LoFTR.src.loftr import LoFTR, default_cfg
from shirt_detection import detect

def match(file1, file2, image_type='outdoor'):

    try:
        bounding_boxes_1 = detect(source=file1, imgsz=(640, 640))
        bounding_boxes_2 = detect(source=file2, imgsz=(640, 640))
    except:
        return False

    if len(bounding_boxes_1) == 0 or len(bounding_boxes_2) == 0:
        return False

    def is_in_box(x, y, bounding_boxes):
        for bounding_box in bounding_boxes:
            if bounding_box[0] <= x <= bounding_box[2] and bounding_box[1] <= y <= bounding_box[3]:
                return True
        return False

    def draw_bounding_box(image, bounding_boxes):
        for bounding_box in bounding_boxes:
            image = cv2.rectangle(image, (int(bounding_box[0]), int(bounding_box[1])),
                                  (int(bounding_box[2]), int(bounding_box[3])), (255, 0, 0), 2)
        return image

    matcher = LoFTR(config=default_cfg)
    if image_type == 'indoor':
        matcher.load_state_dict(torch.load("weights/indoor_ds.ckpt")['state_dict'])
    elif image_type == 'outdoor':
        matcher.load_state_dict(torch.load("weights/outdoor_ds.ckpt")['state_dict'])
    else:
        raise ValueError("Wrong image_type is given.")
    matcher = matcher.eval().cuda()

    # Rerun this cell (and below) if a new image pair is uploaded.
    img0_raw = cv2.imread(file1, cv2.IMREAD_GRAYSCALE)
    img1_raw = cv2.imread(file2, cv2.IMREAD_GRAYSCALE)
    img0_raw = cv2.resize(img0_raw, (640, 640))
    img1_raw = cv2.resize(img1_raw, (640, 640))

    img0 = torch.from_numpy(img0_raw)[None][None].cuda() / 255.
    img1 = torch.from_numpy(img1_raw)[None][None].cuda() / 255.
    batch = {'image0': img0, 'image1': img1}

    # Inference with LoFTR and get prediction
    with torch.no_grad():
        matcher(batch)
        mkpts0 = batch['mkpts0_f'].cpu().numpy()
        mkpts1 = batch['mkpts1_f'].cpu().numpy()
        mconf = batch['mconf'].cpu().numpy()

    matches_1 = []
    matches_2 = []
    confidences = []
    for i in range(len(mkpts0)):
        if is_in_box(mkpts0[i][0], mkpts0[i][1], bounding_boxes_1) and is_in_box(mkpts1[i][0], mkpts1[i][1], bounding_boxes_2):
            matches_1.append(mkpts0[i])
            matches_2.append(mkpts1[i])
            confidences.append(mconf[i])
    if len(matches_1) == 0:
        matches_1.append([1, 1])
        matches_2.append([1, 1])
        confidences.append(0.5)
    matches_1 = np.array(matches_1)
    matches_2 = np.array(matches_2)
    confidences = np.array(confidences)

    print(bounding_boxes_1, bounding_boxes_2)
    print(mkpts0, mkpts1)
    print(matches_1, matches_2)
    print(mconf)

    # Draw
    color = cm.jet(confidences, alpha=0.7)
    text = [
        'SmartShopping Duplication Detection',
        'Matches: {}'.format(len(matches_1)),
    ]
    output_file_name = "out/{}.jpg".format(file1.split('/')[1].split('\\')[0])
    print(output_file_name)
    draw_bounding_box(img0_raw, bounding_boxes_1)
    draw_bounding_box(img1_raw, bounding_boxes_2)
    make_matching_figure(img0_raw, img1_raw, matches_1, matches_2, color, matches_1, matches_2, text, path=output_file_name)

    return len(matches_1) > 10

# CODE ĐỂ ĐÁNH GIÁ ĐỘ CHÍNH XÁC
# df_labels = pd.read_csv('labels.csv')
# t1 = time.time()
# labels = df_labels['label'] == 1
# false_indexes = []
# acc = 0.0
# fn = 0
# fp = 0
# tp = 0
# for j in range(1, 401):
#     images = glob.glob('shirt/{}/*.jpg'.format(j))
#     m = match(images[0], images[1])
#     if m == labels[j - 1]:
#         acc += 1
#     elif labels[j - 1] and not m:
#         false_indexes.append(j)
#         fn += 1
#     elif not labels[j - 1] and m:
#         false_indexes.append(j)
#         fp += 1
#     if labels[j - 1] and m:
#         tp += 1
# print('TIME:', time.time() - t1)
# print('FALSE:', false_indexes)
# precision = tp/(tp+fp)
# recall = tp/(tp+fn)
# if precision+recall == 0:
#   f1 = '-'
# else:
#   f1 = 2*precision*recall/(precision+recall)
# print('ACC:', acc/400, ' --- precision:', precision, ' --- recall:', recall, ' --- f1:', f1)