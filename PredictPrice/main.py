import numpy as np
from keras.models import Sequential
from keras.layers import Dense
from keras.layers import LSTM
from keras.layers import Dropout
from sklearn.preprocessing import MinMaxScaler
import random
from datetime import datetime, timedelta, date
import json
import sys
import time


def initDataSource():
    # lay du lieu ve gia cua san pham
    # co dang object: 
    # data = {
    #       "price": [...],
    #       "ts": [...]
    # }
    return {
        "price": [
113000,
92000,
116000,
121000,
121000,
125000,
135000,
135000,
116000,
135000,
135000,
120000,
135000,
120000,
135000,
135000,
115000,
135000,
115000,
115000
],
"ts": [
1629239875000,
1629642786000,
1630305242000,
1631299625000,
1631713175000,
1632518814000,
1633943682000,
1634194414000,
1634288293000,
1634557307000,
1635368738000,
1635690478000,
1636657938000,
1636919544000,
1638012017000,
1639067429000,
1639271746000,
1639573303000,
1640163113000,
1640308620246
]
    }

def Processing(data):
    new_data = []
    startTime = time.time()
    desc = ''
    desc += str(len(data['price']))
    
    for x in range(len(data['ts']) - 1):
        start_date = str(datetime.utcfromtimestamp(data['ts'][x]/1000).strftime('%d/%m/%Y')).split('/')
        end_date = str(datetime.utcfromtimestamp(data['ts'][x+1]/1000).strftime('%d/%m/%Y')).split('/')

        d0 = date(int(start_date[2]),int(start_date[1]),int(start_date[0]))
        d1 = date(int(end_date[2]),int(end_date[1]),int(end_date[0]))
        delta = d1 - d0
        # 3 giờ 1 lần
        count = delta.days * 8
        # count = delta.days
        new_data.append( data['price'][x])
        while count != 1 and count > 0:
            if data['price'][x] <= data['price'][x + 1]:
                temp = random.randint(int(data['price'][x]), int(data['price'][x+1]))

            if data['price'][x] > data['price'][x + 1]:
                temp = random.randint(int(data['price'][x+1]), int(data['price'][x]))

            new_data.append(temp)
            count = count - 1

    data_end = int(np.floor(0.8*(len(new_data))))
    dataset_train = new_data[:data_end]
    training_set = np.reshape(new_data[:data_end], (-1, 1))
    sc = MinMaxScaler(feature_range = (0, 1))
    training_set_scaled = sc.fit_transform(training_set)

    # Tao du lieu train, X = 32 time steps, Y =  1 time step
    X_train = []
    y_train = []
    no_of_sample = len(training_set)

    for i in range(32, no_of_sample):
        X_train.append(training_set_scaled[i-32:i, 0])
        y_train.append(training_set_scaled[i, 0])

    X_train, y_train = np.array(X_train), np.array(y_train)
    X_train = np.reshape(X_train, (X_train.shape[0], X_train.shape[1], 1))

    regressor = Sequential()
    regressor.add(LSTM(units = 50, return_sequences = True, input_shape = (X_train.shape[1], 1)))
    regressor.add(Dropout(0.2))
    regressor.add(LSTM(units = 50, return_sequences = True))
    regressor.add(Dropout(0.2))
    regressor.add(LSTM(units = 50, return_sequences = True))
    regressor.add(Dropout(0.2))
    regressor.add(LSTM(units = 50))
    regressor.add(Dropout(0.2))
    regressor.add(Dense(units = 1))
    regressor.compile(optimizer = 'adam', loss = 'mse')
    regressor.fit(X_train, y_train, epochs = 1, batch_size=32)


    dataset_test = data['price'][data_end:]
    inputs = np.reshape( new_data[len(dataset_train) - 32:], (-1,1))
    inputs = sc.transform(inputs)
    X_test = []
    no_of_sample = len(inputs)

    for i in range(32, no_of_sample):
        X_test.append(inputs[i-32:i, 0])

    X_test = np.array(X_test)
    X_test = np.reshape(X_test, (X_test.shape[0], X_test.shape[1], 1))
    predicted_stock_price = regressor.predict(X_test)
    predicted_stock_price = sc.inverse_transform(predicted_stock_price)

    # Du doan tiep gia cac ngay tiep theo trong 3 thang ~ 90 ngay
    dataset_test = new_data[len(new_data)-32:len(new_data)]
    dataset_test = np.array(dataset_test)

    inputs = dataset_test
    inputs = inputs.reshape(-1,1)
    inputs = sc.transform(inputs)
    last_date = str(datetime.utcfromtimestamp(data['ts'][len(data['ts']) - 1]/1000).strftime('%d/%m/%Y')).split('/')
    last_date_time = datetime(int(last_date[2]),int(last_date[1]),int(last_date[0]))
    i = 0
    # 3h  = 1 lần --> 1 ngày = 8 lần ==> i = 0; i = 7; i = 14 ...
    results = {
        "price": [],
        "ts": []
    }
    while i<720:
        X_test = []
        no_of_sample = len(dataset_test)

        # Lay du lieu cuoi cung
        X_test.append(inputs[no_of_sample - 32:no_of_sample, 0])
        X_test = np.array(X_test)
        X_test = np.reshape(X_test, (X_test.shape[0], X_test.shape[1], 1))

        # Du doan gia
        predicted_stock_price = regressor.predict(X_test)

        # chuyen gia tu khoang (0,1) thanh gia that
        predicted_stock_price = sc.inverse_transform(predicted_stock_price)

        # Them ngay hien tai vao
        dataset_test = np.append(dataset_test, predicted_stock_price[0], axis=0)
        inputs = dataset_test
        inputs = inputs.reshape(-1, 1)
        inputs = sc.transform(inputs)
        if i % 7 == 0:
            last_date_time += timedelta(days=1)
            dt = last_date_time.timestamp()
            results['price'].append(predicted_stock_price[0][0])
            results['ts'].append(dt*1000)
        i = i + 1
        
    return results
    
# data = initDataSource()
predict = Processing(json.loads(sys.argv[1]))
print('result:', predict)
